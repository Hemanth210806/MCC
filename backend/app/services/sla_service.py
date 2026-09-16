from datetime import datetime, timedelta
from typing import Optional, List
from app.extensions import db
from app.models.complaint import Complaint, ComplaintStatusHistory
from app.models.analytics import SlaRule
from app.services.notification_service import notification_service

class SlaService:
    DEFAULT_SLA_HOURS = {
        'HIGH': 24,
        'MEDIUM': 72,
        'LOW': 168
    }

    VALID_TRANSITIONS = {
        'SUBMITTED': ['ASSIGNED'],
        'ASSIGNED': ['IN_PROGRESS'],
        'IN_PROGRESS': ['VERIFICATION_PENDING', 'OVERDUE'],
        'VERIFICATION_PENDING': ['RESOLVED', 'REOPENED'],
        'REOPENED': ['IN_PROGRESS'],
        'OVERDUE': ['IN_PROGRESS', 'VERIFICATION_PENDING'],
        'RESOLVED': []
    }

    @classmethod
    def calculate_due_date(cls, priority: str, from_time: Optional[datetime] = None) -> datetime:
        from_time = from_time or datetime.utcnow()
        rule = SlaRule.query.filter_by(priority=priority).first()
        hours = rule.target_hours if rule else cls.DEFAULT_SLA_HOURS.get(priority, 72)
        return from_time + timedelta(hours=hours)

    @classmethod
    def transition_status(
        cls,
        complaint: Complaint,
        new_status: str,
        user_id: Optional[int] = None,
        remarks: Optional[str] = None
    ) -> bool:
        """
        Enforce valid state machine transitions and append to history.
        """
        old_status = complaint.status

        # If already at that status, allow idempotent update if remarks provided
        if old_status == new_status:
            return True

        # Check valid transition
        allowed = cls.VALID_TRANSITIONS.get(old_status, [])
        if new_status not in allowed and new_status != 'OVERDUE':
            raise ValueError(f"Invalid status transition from {old_status} to {new_status}")

        complaint.status = new_status
        complaint.updated_at = datetime.utcnow()

        history = ComplaintStatusHistory(
            complaint_id=complaint.id,
            old_status=old_status,
            new_status=new_status,
            changed_by_user_id=user_id,
            remarks=remarks or f"Status transitioned from {old_status} to {new_status}"
        )
        db.session.add(history)
        db.session.commit()
        return True

    @classmethod
    def check_and_escalate_overdue(cls) -> List[Complaint]:
        """
        Finds complaints that have passed sla_due_at, are not RESOLVED,
        marks them as OVERDUE and generates escalation notifications.
        """
        now = datetime.utcnow()
        overdue_complaints = Complaint.query.filter(
            Complaint.sla_due_at <= now,
            Complaint.status.notin_(['RESOLVED', 'OVERDUE'])
        ).all()

        for c in overdue_complaints:
            cls.transition_status(
                complaint=c,
                new_status='OVERDUE',
                remarks=f"Automated SLA Escalation: Due at {c.sla_due_at.isoformat()} was exceeded."
            )
            # Escalate notification to department & corporator
            notification_service.send(
                recipient_type='department',
                recipient_ref_id=c.department_id,
                message=f"ESCALATION: Complaint {c.complaint_code} in Ward {c.ward.ward_name if c.ward else ''} is OVERDUE!",
                complaint_id=c.id
            )
            if c.ward and c.ward.corporator_user_id:
                notification_service.send(
                    recipient_type='corporator',
                    recipient_ref_id=c.ward.corporator_user_id,
                    message=f"ALERT: Complaint {c.complaint_code} in your ward is OVERDUE.",
                    complaint_id=c.id
                )

        return overdue_complaints

sla_service = SlaService()
