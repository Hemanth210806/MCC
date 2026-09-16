from app.extensions import db

class ImportantLocation(db.Model):
    __tablename__ = 'important_locations'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # school, hospital, college, bus_stop, railway_station, govt_office
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'latitude': self.latitude,
            'longitude': self.longitude
        }
