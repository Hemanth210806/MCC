from typing import Optional

from shapely.geometry import shape

from app.models.complaint import Complaint
from app.models.department import Department
from app.models.user import User
from app.models.ward import Ward
from app.utils.geo import haversine_distance_meters


ACTIVE_WORK_STATUSES = ("ASSIGNED", "IN_PROGRESS", "OVERDUE", "REOPENED")


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
        return None

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

    # Preserve the ward-local queue when every same-department worker is busy.
    if same_ward_workers:
        return min(same_ward_workers, key=lambda worker: worker.id)

    return min(
        workers,
        key=lambda worker: (
            _ward_distance_meters(ward, worker.ward, latitude, longitude),
            worker.id,
        ),
    )
