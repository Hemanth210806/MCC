from typing import Dict, Any, List
from app.models.ward import Ward
from app.models.complaint import Complaint
from app.models.analytics import RecurringIssue

class HealthScoreService:
    @staticmethod
    def compute_ward_score(ward_id: int) -> Dict[str, Any]:
        """
        Computes the Ward Civic Health Score (0 - 100) and returns detailed breakdown factors.
        Formula:
        score = 100 - (overdue_count * 5) - (high_priority_pending * 4) - (recurring_count * 3) + (resolution_bonus)
        clamped between 0 and 100.
        """
        ward = Ward.query.get(ward_id)
        if not ward:
            return {'score': 100, 'factors': {}}

        total = Complaint.query.filter_by(ward_id=ward_id).count()
        if total == 0:
            return {
                'ward_id': ward_id,
                'ward_number': ward.ward_number,
                'ward_name': ward.ward_name,
                'health_score': 100,
                'rating': 'EXCELLENT',
                'factors': {
                    'total_complaints': 0,
                    'resolved_count': 0,
                    'resolution_rate_pct': 100.0,
                    'overdue_count': 0,
                    'high_priority_pending': 0,
                    'recurring_issues_count': 0
                }
            }

        resolved_count = Complaint.query.filter_by(ward_id=ward_id, status='RESOLVED').count()
        resolution_rate = (resolved_count / total) * 100.0

        overdue_count = Complaint.query.filter_by(ward_id=ward_id, status='OVERDUE').count()

        high_priority_pending = Complaint.query.filter_by(
            ward_id=ward_id,
            priority='HIGH'
        ).filter(Complaint.status.notin_(['RESOLVED'])).count()

        # Count recurring issues involving complaints in this ward
        ward_complaint_ids = [c.id for c in Complaint.query.filter_by(ward_id=ward_id).all()]
        recurring_count = RecurringIssue.query.filter(RecurringIssue.new_complaint_id.in_(ward_complaint_ids)).count() if ward_complaint_ids else 0

        # Calculate bonus / penalties
        # Resolution bonus: up to +15 if resolution rate > 75%
        res_bonus = 15 if resolution_rate >= 80 else (10 if resolution_rate >= 60 else 0)

        raw_score = 100 - (overdue_count * 5) - (high_priority_pending * 4) - (recurring_count * 3) + res_bonus
        final_score = max(0, min(100, int(round(raw_score))))

        if final_score >= 80:
            rating = 'EXCELLENT'
        elif final_score >= 60:
            rating = 'GOOD'
        elif final_score >= 40:
            rating = 'AVERAGE'
        else:
            rating = 'CRITICAL'

        return {
            'ward_id': ward_id,
            'ward_number': ward.ward_number,
            'ward_name': ward.ward_name,
            'health_score': final_score,
            'rating': rating,
            'factors': {
                'total_complaints': total,
                'resolved_count': resolved_count,
                'resolution_rate_pct': round(resolution_rate, 1),
                'overdue_count': overdue_count,
                'high_priority_pending': high_priority_pending,
                'recurring_issues_count': recurring_count,
                'resolution_bonus': res_bonus
            }
        }

    @staticmethod
    def compute_all_wards() -> List[Dict[str, Any]]:
        wards = Ward.query.order_by(Ward.ward_number.asc()).all()
        return [HealthScoreService.compute_ward_score(w.id) for w in wards]

health_score_service = HealthScoreService()
