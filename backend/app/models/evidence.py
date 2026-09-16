from datetime import datetime
from app.extensions import db

class ResolutionEvidence(db.Model):
    __tablename__ = 'resolution_evidence'

    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey('complaints.id'), nullable=False, unique=True)
    officer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    photo_path = db.Column(db.String(255), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    gps_accuracy_m = db.Column(db.Float, nullable=True)
    distance_from_original_m = db.Column(db.Float, nullable=False)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)

    verified_by_admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    verification_status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    verification_notes = db.Column(db.Text, nullable=True)
    verified_at = db.Column(db.DateTime, nullable=True)

    officer = db.relationship('User', foreign_keys=[officer_id])
    admin = db.relationship('User', foreign_keys=[verified_by_admin_id])

    def to_dict(self):
        return {
            'id': self.id,
            'complaint_id': self.complaint_id,
            'officer_id': self.officer_id,
            'officer_name': self.officer.name if self.officer else None,
            'photo_path': self.photo_path,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'gps_accuracy_m': self.gps_accuracy_m,
            'distance_from_original_m': round(self.distance_from_original_m, 1),
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'verified_by_admin_id': self.verified_by_admin_id,
            'verified_by_admin_name': self.admin.name if self.admin else None,
            'verification_status': self.verification_status,
            'verification_notes': self.verification_notes,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None
        }
