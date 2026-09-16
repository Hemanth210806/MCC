from datetime import datetime
from app.extensions import db

class Hotspot(db.Model):
    __tablename__ = 'hotspots'

    id = db.Column(db.Integer, primary_key=True)
    ward_id = db.Column(db.Integer, db.ForeignKey('wards.id'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    center_lat = db.Column(db.Float, nullable=False)
    center_lng = db.Column(db.Float, nullable=False)
    complaint_count = db.Column(db.Integer, nullable=False)
    radius_m = db.Column(db.Float, default=200.0)
    detected_at = db.Column(db.DateTime, default=datetime.utcnow)
    active = db.Column(db.Boolean, default=True)

    ward = db.relationship('Ward')
    category = db.relationship('Category')

    def to_dict(self):
        return {
            'id': self.id,
            'ward_id': self.ward_id,
            'ward_name': self.ward.ward_name if self.ward else None,
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else None,
            'center_lat': self.center_lat,
            'center_lng': self.center_lng,
            'complaint_count': self.complaint_count,
            'radius_m': self.radius_m,
            'detected_at': self.detected_at.isoformat() if self.detected_at else None,
            'active': self.active
        }

class RecurringIssue(db.Model):
    __tablename__ = 'recurring_issues'

    id = db.Column(db.Integer, primary_key=True)
    previous_complaint_id = db.Column(db.Integer, db.ForeignKey('complaints.id'), nullable=False)
    new_complaint_id = db.Column(db.Integer, db.ForeignKey('complaints.id'), nullable=False)
    distance_m = db.Column(db.Float, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    detected_at = db.Column(db.DateTime, default=datetime.utcnow)

    previous_complaint = db.relationship('Complaint', foreign_keys=[previous_complaint_id])
    new_complaint = db.relationship('Complaint', foreign_keys=[new_complaint_id])
    category = db.relationship('Category', foreign_keys=[category_id])

    def to_dict(self):
        return {
            'id': self.id,
            'previous_complaint_id': self.previous_complaint_id,
            'previous_complaint_code': self.previous_complaint.complaint_code if self.previous_complaint else None,
            'new_complaint_id': self.new_complaint_id,
            'new_complaint_code': self.new_complaint.complaint_code if self.new_complaint else None,
            'distance_m': round(self.distance_m, 1),
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else None,
            'detected_at': self.detected_at.isoformat() if self.detected_at else None
        }

class SlaRule(db.Model):
    __tablename__ = 'sla_rules'

    id = db.Column(db.Integer, primary_key=True)
    priority = db.Column(db.String(20), unique=True, nullable=False)  # LOW, MEDIUM, HIGH
    target_hours = db.Column(db.Integer, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'priority': self.priority,
            'target_hours': self.target_hours
        }

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    entity_type = db.Column(db.String(50), nullable=False)
    entity_id = db.Column(db.Integer, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    details = db.Column(db.JSON, nullable=True)

    user = db.relationship('User', foreign_keys=[user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else 'System',
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'details': self.details
        }
