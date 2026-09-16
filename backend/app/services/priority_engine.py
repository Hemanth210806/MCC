from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from app.utils.geo import haversine_distance_meters
from app.models.important_location import ImportantLocation
from app.models.complaint import Complaint

class PriorityEngine:
    # Base scores per category
    DEFAULT_BASE_SCORES = {
        'Water Leakage': 45,
        'Pothole / Road Damage': 40,
        'pothole': 40,
        'water_leakage': 45,
        'Garbage / Waste': 30,
        'garbage': 30,
        'Streetlight Failure': 25,
        'streetlight': 25
    }

    def __init__(self, thresholds: Optional[Dict[str, int]] = None):
        self.thresholds = thresholds or {
            'HIGH': 70,
            'MEDIUM': 40
        }

    def compute_priority(
        self,
        category_name: str,
        latitude: float,
        longitude: float,
        similar_nearby_count: int = 0,
        complaint_age_hours: float = 0.0,
        is_overdue: bool = False
    ) -> Dict[str, Any]:
        """
        Computes priority score, level (LOW, MEDIUM, HIGH), and human-readable reasons.
        """
        score = 0
        reasons: List[str] = []

        # 1. Base Score
        base = self.DEFAULT_BASE_SCORES.get(category_name, 30)
        score += base
        reasons.append(f"Base severity for {category_name}: +{base}")

        # 2. Proximity to Important Locations
        locations = ImportantLocation.query.all()
        min_school_hosp_dist = float('inf')
        nearest_school_hosp_name = ""
        min_college_dist = float('inf')
        nearest_college_name = ""
        min_bus_dist = float('inf')
        nearest_bus_name = ""

        for loc in locations:
            dist = haversine_distance_meters(latitude, longitude, loc.latitude, loc.longitude)
            if loc.type in ('school', 'hospital'):
                if dist < min_school_hosp_dist:
                    min_school_hosp_dist = dist
                    nearest_school_hosp_name = f"{loc.name} ({loc.type})"
            elif loc.type == 'college':
                if dist < min_college_dist:
                    min_college_dist = dist
                    nearest_college_name = loc.name
            elif loc.type in ('bus_stop', 'railway_station'):
                if dist < min_bus_dist:
                    min_bus_dist = dist
                    nearest_bus_name = loc.name

        # Distance rules:
        # +30 if within 100m of a school or hospital; +15 if within 300m
        if min_school_hosp_dist <= 100:
            score += 30
            reasons.append(f"Within 100m of {nearest_school_hosp_name} ({int(min_school_hosp_dist)}m): +30")
        elif min_school_hosp_dist <= 300:
            score += 15
            reasons.append(f"Within 300m of {nearest_school_hosp_name} ({int(min_school_hosp_dist)}m): +15")

        # +10 if within 200m of a college
        if min_college_dist <= 200:
            score += 10
            reasons.append(f"Within 200m of {nearest_college_name} ({int(min_college_dist)}m): +10")

        # +5 if within 300m of a bus stop or transit
        if min_bus_dist <= 300:
            score += 5
            reasons.append(f"Within 300m of {nearest_bus_name} ({int(min_bus_dist)}m): +5")

        # 3. Density of nearby complaints: +5 per similar complaint (max +25)
        if similar_nearby_count > 0:
            density_bonus = min(similar_nearby_count * 5, 25)
            score += density_bonus
            reasons.append(f"{similar_nearby_count} similar complaints nearby: +{density_bonus}")

        # 4. Overdue aging bonus: +10 if age > SLA target
        if is_overdue or complaint_age_hours > 72:
            score += 10
            reasons.append(f"Overdue / SLA threshold reached: +10")

        # Determine Priority Category
        if score >= self.thresholds['HIGH']:
            level = 'HIGH'
        elif score >= self.thresholds['MEDIUM']:
            level = 'MEDIUM'
        else:
            level = 'LOW'

        return {
            'priority': level,
            'score': score,
            'reasons': reasons
        }

priority_engine = PriorityEngine()
