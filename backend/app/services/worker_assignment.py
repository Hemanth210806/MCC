from typing import Optional

from shapely.geometry import shape

from app.models.complaint import Complaint
from app.models.department import Department
from app.models.user import User
from app.models.ward import Ward
from app.extensions import db
from app.utils.geo import haversine_distance_meters


ACTIVE_WORK_STATUSES = ("ASSIGNED", "IN_PROGRESS", "OVERDUE", "REOPENED")
WORKER_DEPARTMENT_SLUGS = {
    "Solid Waste Management": "waste",
    "Roads & Infrastructure": "road",
    "Electrical & Street Lighting": "street",
    "Water Supply & Sewerage": "water",
}
_WORKER_PASSWORD_HASH = None


def _ensure_ward_worker(ward: Ward, department: Department) -> User:
    global _WORKER_PASSWORD_HASH
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
    if not worker.password_hash:
        if _WORKER_PASSWORD_HASH is None:
            worker.set_password("Worker@123")
            _WORKER_PASSWORD_HASH = worker.password_hash
        else:
            worker.password_hash = _WORKER_PASSWORD_HASH
    db.session.flush()
    return worker


def ensure_all_ward_department_workers() -> None:
    """Create the four department workers for every official ward."""
    from app.models.department import Department

    departments = {
        department.name: department
        for department in Department.query.all()
    }
    for ward in Ward.query.order_by(Ward.ward_number).all():
        for department_name in WORKER_DEPARTMENT_SLUGS:
            department = departments.get(department_name)
            if department:
                _ensure_ward_worker(ward, department)
    db.session.commit()


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

    # Keep the originating ward's worker as the final fallback so every
    # complaint is assigned even when the entire department is occupied.
    if same_ward_workers:
        return min(same_ward_workers, key=lambda worker: worker.id)
    return None
