import json
import os
from typing import Optional, Dict, Any
from shapely.geometry import shape, Point

class WardLookupService:
    _instance = None
    _wards = []

    def __init__(self, geojson_path: Optional[str] = None):
        if not geojson_path:
            backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
            geojson_path = os.path.join(backend_dir, 'data', 'mysuru_wards.geojson')
        
        self.geojson_path = geojson_path
        self._load_wards()

    def _load_wards(self):
        if not os.path.exists(self.geojson_path):
            print(f"[WardLookupService] Warning: Ward GeoJSON not found at {self.geojson_path}")
            return

        with open(self.geojson_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        self._wards = []
        for feat in data.get('features', []):
            geom = shape(feat['geometry'])
            props = feat.get('properties', {})
            self._wards.append({
                'ward_id': props.get('ward_id') or props.get('ward_number'),
                'ward_number': props.get('ward_number'),
                'ward_name': props.get('ward_name', f"Ward {props.get('ward_number')}"),
                'geometry': geom,
                'raw_geometry': feat['geometry']
            })
        print(f"[WardLookupService] Loaded {len(self._wards)} real MCC wards.")

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = WardLookupService()
        return cls._instance

    def lookup(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """
        Lookup ward for given latitude and longitude.
        Note: GeoJSON / Shapely coordinates are [longitude, latitude].
        Returns:
            {
                "outside_mcc_boundary": bool,
                "ward_number": Optional[int],
                "ward_name": Optional[str],
                "ward_id": Optional[int]
            }
        """
        point = Point(longitude, latitude)

        # 1. Exact point-in-polygon match
        for w in self._wards:
            if w['geometry'].contains(point) or w['geometry'].touches(point):
                return {
                    "outside_mcc_boundary": False,
                    "ward_number": w['ward_number'],
                    "ward_name": w['ward_name'],
                    "ward_id": w['ward_id']
                }

        # 2. Road centerline / boundary sliver tolerance:
        # GPS points taken on municipal streets, intersections, or sidewalks separating
        # adjacent wards can fall into slight 1-50m digitization sliver gaps between polygons.
        # Allow up to 0.003 degrees (~330 meters) buffer to snap to the nearest MCC ward.
        TOLERANCE_DEG = 0.003
        min_dist = float('inf')
        closest_ward = None

        for w in self._wards:
            d = w['geometry'].distance(point)
            if d < min_dist:
                min_dist = d
                closest_ward = w

        if closest_ward and min_dist <= TOLERANCE_DEG:
            return {
                "outside_mcc_boundary": False,
                "ward_number": closest_ward['ward_number'],
                "ward_name": closest_ward['ward_name'],
                "ward_id": closest_ward['ward_id']
            }

        return {
            "outside_mcc_boundary": True,
            "ward_number": None,
            "ward_name": None,
            "ward_id": None
        }

    def get_all_wards_geojson(self) -> Dict[str, Any]:
        if os.path.exists(self.geojson_path):
            with open(self.geojson_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {"type": "FeatureCollection", "features": []}

ward_lookup_service = WardLookupService.get_instance()

