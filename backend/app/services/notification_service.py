from typing import Optional
from app.extensions import db
from app.models.notification import Notification

class NotificationService:
    @staticmethod
    def send(recipient_type: str, recipient_ref_id: Optional[int], message: str, complaint_id: Optional[int] = None) -> Notification:
        """
        Abstracted notification sender. Default implementation persists to notifications table.
        Allows plugging in SMS / Email gateways without altering caller code.
        """
        notif = Notification(
            recipient_type=recipient_type,
            recipient_ref_id=recipient_ref_id,
            complaint_id=complaint_id,
            message=message
        )
        db.session.add(notif)
        db.session.commit()

        # Log for external gateway visibility
        print(f"[NotificationService] Dispatched to {recipient_type} (Ref: {recipient_ref_id}): {message}")
        return notif

notification_service = NotificationService()
