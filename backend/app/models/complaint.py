from datetime import datetime
from app.extensions import db

class Complaint(db.Model):
    __tablename__ = 'complaints'

    id = db.Column(db.Integer, primary_key=True)
    complaint_code = db.Column(db.String(30), unique=True, nullable=False, index=True)
    citizen_name = db.Column(db.String(120), nullable=True)
    citizen_phone = db.Column(db.String(20), nullable=True, index=True)
    citizen_email = db.Column(db.String(120), nullable=True)
    description = db.Column(db.Text, nullable=True)

    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True)
    ai_predicted_category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True)
    ai_confidence = db.Column(db.Float, nullable=True)
    ai_low_confidence = db.Column(db.Boolean, default=False)
    ai_classification_status = db.Column(db.String(30), default='CLASSIFIED')  # CLASSIFIED, LOW_CONFIDENCE, REVIEW_REQUIRED
    ai_model_version = db.Column(db.String(50), nullable=True)

    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    gps_accuracy_m = db.Column(db.Float, nullable=True)

    ward_id = db.Column(db.Integer, db.ForeignKey('wards.id'), nullable=True, index=True)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=True, index=True)

    priority = db.Column(db.String(20), default='MEDIUM', index=True)  # LOW, MEDIUM, HIGH
    priority_score = db.Column(db.Integer, default=50)
    priority_reasons = db.Column(db.JSON, nullable=True)  # list of strings

    status = db.Column(db.String(30), default='SUBMITTED', index=True)
    # SUBMITTED, ASSIGNED, IN_PROGRESS, VERIFICATION_PENDING, RESOLVED, REOPENED, OVERDUE

    report_count = db.Column(db.Integer, default=1)  # Increments when multiple citizens report same micro-location issue
    merged_into_complaint_id = db.Column(db.Integer, db.ForeignKey('complaints.id'), nullable=True)

    sla_due_at = db.Column(db.DateTime, nullable=True)
    is_demo_data = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    category = db.relationship('Category', foreign_keys=[category_id])
    ai_predicted_category = db.relationship('Category', foreign_keys=[ai_predicted_category_id])
    ward = db.relationship('Ward', backref='complaints')
    department = db.relationship('Department', backref='complaints')
    images = db.relationship('ComplaintImage', backref='complaint', lazy='dynamic', cascade='all, delete-orphan')
    status_history = db.relationship('ComplaintStatusHistory', backref='complaint', lazy='dynamic', order_by='ComplaintStatusHistory.created_at.asc()', cascade='all, delete-orphan')
    resolution_evidence = db.relationship('ResolutionEvidence', backref='complaint', uselist=False, cascade='all, delete-orphan')
    feedback = db.relationship('Feedback', backref='complaint', uselist=False, cascade='all, delete-orphan')

    def to_dict(self, include_sensitive=False):
        d = {
            'id': self.id,
            'complaint_code': self.complaint_code,
            'description': self.description,
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else 'Uncategorized',
            'ai_predicted_category_name': self.ai_predicted_category.name if self.ai_predicted_category else None,
            'ai_confidence': round(self.ai_confidence, 3) if self.ai_confidence is not None else None,
            'ai_low_confidence': self.ai_low_confidence,
            'ai_classification_status': self.ai_classification_status,
            'ai_model_version': self.ai_model_version,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'gps_accuracy_m': self.gps_accuracy_m,
            'ward_id': self.ward_id,
            'ward_number': self.ward.ward_number if self.ward else None,
            'ward_name': self.ward.ward_name if self.ward else 'Unknown Ward',
            'department_id': self.department_id,
            'department_name': self.department.name if self.department else None,
            'priority': self.priority,
            'priority_score': self.priority_score,
            'priority_reasons': self.priority_reasons or [],
            'status': self.status,
            'report_count': self.report_count or 1,
            'merged_into_complaint_id': self.merged_into_complaint_id,
            'sla_due_at': self.sla_due_at.isoformat() if self.sla_due_at else None,
            'is_demo_data': self.is_demo_data,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'images': [img.to_dict() for img in self.images],
            'resolution_evidence': self.resolution_evidence.to_dict() if self.resolution_evidence else None,
            'feedback': self.feedback.to_dict() if self.feedback else None
        }

        # Obscure coordinates slightly for public endpoints if needed
        if include_sensitive:
            d['citizen_name'] = self.citizen_name
            d['citizen_phone'] = self.citizen_phone
            d['citizen_email'] = self.citizen_email

        return d

class ComplaintImage(db.Model):
    __tablename__ = 'complaint_images'

    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey('complaints.id'), nullable=False)
    image_path = db.Column(db.String(255), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    image_type = db.Column(db.String(30), default='ORIGINAL')  # ORIGINAL, OTHER

    def to_dict(self):
        return {
            'id': self.id,
            'complaint_id': self.complaint_id,
            'image_path': self.image_path,
            'image_type': self.image_type,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }

class ComplaintStatusHistory(db.Model):
    __tablename__ = 'complaint_status_history'

    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey('complaints.id'), nullable=False)
    old_status = db.Column(db.String(30), nullable=True)
    new_status = db.Column(db.String(30), nullable=False)
    changed_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    remarks = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    changed_by_user = db.relationship('User', foreign_keys=[changed_by_user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'complaint_id': self.complaint_id,
            'old_status': self.old_status,
            'new_status': self.new_status,
            'changed_by_user_id': self.changed_by_user_id,
            'changed_by_user_name': self.changed_by_user.name if self.changed_by_user else 'System/Citizen',
            'remarks': self.remarks,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Feedback(db.Model):
    __tablename__ = 'feedback'

    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey('complaints.id'), nullable=False, unique=True)
    rating = db.Column(db.Integer, nullable=False)  # 1-5
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'complaint_id': self.complaint_id,
            'rating': self.rating,
            'comment': self.comment,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
