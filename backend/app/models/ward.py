from app.extensions import db
import json

class Ward(db.Model):
    __tablename__ = 'wards'

    id = db.Column(db.Integer, primary_key=True)
    ward_number = db.Column(db.Integer, unique=True, nullable=False, index=True)
    ward_name = db.Column(db.String(120), nullable=False)
    geometry = db.Column(db.JSON, nullable=False)  # GeoJSON polygon/multipolygon
    corporator_user_id = db.Column(db.Integer, db.ForeignKey('users.id', use_alter=True), nullable=True)

    corporator = db.relationship('User', foreign_keys=[corporator_user_id], post_update=True)

    def to_dict(self, include_geom=False):
        d = {
            'id': self.id,
            'ward_number': self.ward_number,
            'ward_name': self.ward_name,
            'corporator_user_id': self.corporator_user_id,
            'corporator_name': self.corporator.name if self.corporator else None
        }
        if include_geom:
            d['geometry'] = self.geometry
        return d
