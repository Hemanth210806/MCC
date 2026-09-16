import numpy as np
from datetime import datetime
from sklearn.cluster import DBSCAN
from app.extensions import db
from app.models.complaint import Complaint
from app.models.analytics import Hotspot
from app.models.ward import Ward
from app.models.department import Category

class HotspotService:
    def __init__(self, eps_meters: float = 350.0, min_samples: int = 3):
        self.eps_meters = eps_meters
        # Earth radius in meters
        self.kms_per_radian = 6371000.0
        self.eps_radians = self.eps_meters / self.kms_per_radian
        self.min_samples = min_samples

    def recalculate_hotspots(self) -> int:
        """
        Runs DBSCAN clustering on active complaints per ward and category.
        Saves clusters to the hotspots table.
        """
        # Deactivate old hotspots
        Hotspot.query.filter_by(active=True).update({'active': False})
        db.session.commit()

        new_count = 0
        wards = Ward.query.all()
        categories = Category.query.all()

        for ward in wards:
            for cat in categories:
                complaints = Complaint.query.filter_by(
                    ward_id=ward.id,
                    category_id=cat.id
                ).filter(Complaint.status.notin_(['RESOLVED'])).all()

                if len(complaints) < self.min_samples:
                    continue

                # Extract coordinates in radians for Haversine DBSCAN
                coords = np.array([[math_rad(c.latitude), math_rad(c.longitude)] for c in complaints])

                dbscan = DBSCAN(eps=self.eps_radians, min_samples=self.min_samples, metric='haversine')
                labels = dbscan.fit_predict(coords)

                unique_labels = set(labels)
                for label in unique_labels:
                    if label == -1:
                        # Noise
                        continue

                    cluster_mask = (labels == label)
                    cluster_complaints = [c for c, m in zip(complaints, cluster_mask) if m]
                    
                    if not cluster_complaints:
                        continue

                    center_lat = np.mean([c.latitude for c in cluster_complaints])
                    center_lng = np.mean([c.longitude for c in cluster_complaints])
                    
                    hotspot = Hotspot(
                        ward_id=ward.id,
                        category_id=cat.id,
                        center_lat=float(center_lat),
                        center_lng=float(center_lng),
                        complaint_count=len(cluster_complaints),
                        radius_m=self.eps_meters,
                        detected_at=datetime.utcnow(),
                        active=True
                    )
                    db.session.add(hotspot)
                    new_count += 1

        db.session.commit()
        print(f"[HotspotService] Detected and saved {new_count} civic hotspots.")
        return new_count

def math_rad(deg: float) -> float:
    import math
    return math.radians(deg)

hotspot_service = HotspotService()
