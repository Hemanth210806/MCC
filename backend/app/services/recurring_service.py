from datetime import datetime, timedelta
from typing import Optional
from app.extensions import db
from app.models.complaint import Complaint
from app.models.analytics import RecurringIssue
from app.utils.geo import haversine_distance_meters

class RecurringService:
    def __init__(self, radius_meters: float = 50.0, window_days: int = 90):
        self.radius_meters = radius_meters
        self.window_days = window_days

    def check_and_record_recurring(self, new_complaint: Complaint) -> Optional[RecurringIssue]:
        """
        Check if the newly submitted complaint matches a previously RESOLVED complaint
        with the same category within radius_meters in the last window_days.
        """
        cutoff_date = datetime.utcnow() - timedelta(days=self.window_days)

        resolved_complaints = Complaint.query.filter(
            Complaint.category_id == new_complaint.category_id,
            Complaint.status == 'RESOLVED',
            Complaint.id != new_complaint.id,
            Complaint.updated_at >= cutoff_date
        ).all()

        for past in resolved_complaints:
            dist = haversine_distance_meters(new_complaint.latitude, new_complaint.longitude, past.latitude, past.longitude)
            if dist <= self.radius_meters:
                recurring = RecurringIssue(
                    previous_complaint_id=past.id,
                    new_complaint_id=new_complaint.id,
                    distance_m=dist,
                    category_id=new_complaint.category_id,
                    detected_at=datetime.utcnow()
                )
                db.session.add(recurring)
                db.session.commit()
                print(f"[RecurringService] Identified recurring issue: new {new_complaint.complaint_code} near {past.complaint_code} ({dist:.1f}m)")
                return recurring

        return None

recurring_service = RecurringService()
