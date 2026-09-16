from datetime import datetime
from app.extensions import db

class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    recipient_type = db.Column(db.String(30), nullable=False)  # corporator, officer, department, citizen
    recipient_ref_id = db.Column(db.Integer, nullable=True)     # user_id or department_id
    complaint_id = db.Column(db.Integer, db.ForeignKey('complaints.id'), nullable=True)
    message = db.Column(db.String(255), nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    complaint = db.relationship('Complaint', backref='notifications')

    def to_dict(self):
        return {
            'id': self.id,
            'recipient_type': self.recipient_type,
            'recipient_ref_id': self.recipient_ref_id,
            'complaint_id': self.complaint_id,
            'complaint_code': self.complaint.complaint_code if self.complaint else None,
            'message': self.message,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
