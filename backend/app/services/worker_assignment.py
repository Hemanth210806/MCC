from datetime import datetime
from typing import Optional

from shapely.geometry import shape

from app.models.complaint import Complaint
from app.models.department import Department
from app.models.user import User
from app.models.ward import Ward
from app.extensions import db
from app.utils.geo import haversine_distance_meters
from app.models.complaint import ComplaintStatusHistory


ACTIVE_WORK_STATUSES = ("ASSIGNED", "IN_PROGRESS", "OVERDUE", "REOPENED")
WORKER_DEPARTMENT_SLUGS = {
    "Solid Waste Management": "waste",
    "Roads & Infrastructure": "road",
    "Electrical & Street Lighting": "street",
    "Water Supply & Sewerage": "water",
}


def _ensure_ward_worker(ward: Ward, department: Department) -> User:
    department_slug = WORKER_DEPARTMENT_SLUGS.get(department.name, "general")
    normalized_ward_name = "".join(
        character.lower() if character.isalnum() else "_"
        for character in ward.ward_name
    ).strip("_")
    email = f"{normalized_ward_name}_{department_slug}@mcc.gov.in"
    worker = User.query.filter_by(email=email).first()
    if not worker:
        worker = User(email=email)
        db.session.add(worker)
    worker.name = f"{ward.ward_name} {department_slug.title()} Worker"
    worker.phone = f"98{ward.ward_number:03d}99001"
    worker.role = "ward_worker"
    worker.ward_id = ward.id
    worker.department_id = department.id
    worker.set_password("Worker@123")
    db.session.flush()
    return worker


def _ward_distance_meters(
    source_ward: Optional[Ward],
    candidate_ward: Optional[Ward],
    latitude: Optional[float],
    longitude: Optional[float],
) -> float:
    if source_ward and candidate_ward and source_ward.id == candidate_ward.id:
        return 0.0

    if latitude is not None and longitude is not None and candidate_ward:
        try:
            representative_point = shape(candidate_ward.geometry).representative_point()
            return haversine_distance_meters(
                latitude,
                longitude,
                representative_point.y,
                representative_point.x,
            )
        except (TypeError, ValueError, AttributeError):
            pass

    if source_ward and candidate_ward:
        try:
            source_point = shape(source_ward.geometry).representative_point()
            candidate_point = shape(candidate_ward.geometry).representative_point()
            return haversine_distance_meters(
                source_point.y,
                source_point.x,
                candidate_point.y,
                candidate_point.x,
            )
        except (TypeError, ValueError, AttributeError):
            pass

    return float("inf")


def select_worker(
    ward: Optional[Ward],
    department: Optional[Department],
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> Optional[User]:
    """Select a same-department worker, preferring free workers in nearby wards.

    A worker is free when they have no complaint in an active work status.
    VERIFICATION_PENDING means the worker has submitted the resolution proof and
    is available for another assignment while the admin verifies it.
    """
    if not department:
        return None

    worker_query = User.query.filter_by(
        role="ward_worker",
        department_id=department.id,
    )
    if ward:
        worker_query = worker_query.filter(User.ward_id.isnot(None))
    workers = worker_query.all()
    if not workers:
        if not ward:
            return None
        workers = [_ensure_ward_worker(ward, department)]

    worker_ids = [worker.id for worker in workers]
    busy_worker_ids = {
        worker_id
        for (worker_id,) in Complaint.query.with_entities(Complaint.assigned_worker_id)
        .filter(
            Complaint.assigned_worker_id.in_(worker_ids),
            Complaint.status.in_(ACTIVE_WORK_STATUSES),
        )
        .distinct()
        .all()
    }

    same_ward_workers = [
        worker for worker in workers if ward and worker.ward_id == ward.id
    ]
    if ward and not same_ward_workers:
        same_ward_workers = [_ensure_ward_worker(ward, department)]
        workers.append(same_ward_workers[0])

    if same_ward_workers:
        queued = Complaint.query.filter(
            Complaint.ward_id == ward.id,
            Complaint.department_id == department.id,
            Complaint.assigned_worker_id.is_(None),
            Complaint.status == "SUBMITTED",
        ).order_by(Complaint.created_at.asc(), Complaint.id.asc()).first()
        if queued:
            queue_worker = min(same_ward_workers, key=lambda worker: worker.id)
            if queue_worker.id not in busy_worker_ids:
                assign_next_queued_complaint(queue_worker)
                db.session.flush()
                return None
    free_same_ward = [
        worker for worker in same_ward_workers if worker.id not in busy_worker_ids
    ]
    if free_same_ward:
        return min(free_same_ward, key=lambda worker: worker.id)

    free_nearby = [
        worker for worker in workers
        if worker.id not in busy_worker_ids
        and (not ward or worker.ward_id != ward.id)
    ]
    if free_nearby:
        return min(
            free_nearby,
            key=lambda worker: (
                _ward_distance_meters(ward, worker.ward, latitude, longitude),
                worker.id,
            ),
        )

    # Do not assign an active complaint to a busy worker. The complaint remains
    # unassigned until a worker in this department becomes available.
    return None


def assign_next_queued_complaint(worker: User) -> Optional[Complaint]:
    """Assign the oldest queued complaint for a worker's ward and department."""
    if not worker.ward_id or not worker.department_id:
        return None
    queued = Complaint.query.filter_by(
        ward_id=worker.ward_id,
        department_id=worker.department_id,
        assigned_worker_id=None,
        status="SUBMITTED",
    ).order_by(Complaint.created_at.asc(), Complaint.id.asc()).first()
    if not queued:
        return None
    queued.assigned_worker_id = worker.id
    queued.assigned_at = datetime.utcnow()
    queued.status = "ASSIGNED"
    db.session.add(ComplaintStatusHistory(
        complaint_id=queued.id,
        old_status="SUBMITTED",
        new_status="ASSIGNED",
        remarks=f"Queued complaint assigned to {worker.name} after the worker became available.",
    ))
    return queued
