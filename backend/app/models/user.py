from datetime import datetime
import bcrypt
from app.extensions import db

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(20), nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(30), nullable=False)  # field_officer, corporator, admin
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=True)
    ward_id = db.Column(db.Integer, db.ForeignKey('wards.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    department = db.relationship('Department', backref='users', foreign_keys=[department_id])
    ward = db.relationship('Ward', backref='officers_or_citizens', foreign_keys=[ward_id])

    def set_password(self, password: str):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password: str) -> bool:
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'role': self.role,
            'department_id': self.department_id,
            'department_name': self.department.name if self.department else None,
            'ward_id': self.ward_id,
            'ward_name': self.ward.ward_name if self.ward else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
