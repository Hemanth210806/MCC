import urllib.request
import json
import math
import os
from shapely.geometry import shape, mapping, Polygon, MultiPolygon

def mercator_to_wgs84(x, y):
    lng = (x / 20037508.34) * 180.0
    lat = (y / 20037508.34) * 180.0
    lat = 180.0 / math.pi * (2.0 * math.atan(math.exp(lat * math.pi / 180.0)) - math.pi / 2.0)
    return [round(lng, 6), round(lat, 6)]

def convert_rings(rings):
    converted = []
    for ring in rings:
        converted_ring = [mercator_to_wgs84(pt[0], pt[1]) for pt in ring]
        converted.append(converted_ring)
    return converted

def main():
    url = "https://www.arcgis.com/sharing/rest/content/items/b34decb55ccc447d8c1a232b58629ebe/data?f=json"
    print("Fetching raw GIS data from ArcGIS Hub...")
    req = urllib.request.Request(url, headers={'User-Agent': 'MCC-Dev/1.0'})
    res = urllib.request.urlopen(req, timeout=30).read()
    raw_data = json.loads(res)

    source_dir = os.path.abspath("mysuru-civic-connect/backend/data/source")
    data_dir = os.path.abspath("mysuru-civic-connect/backend/data")
    os.makedirs(source_dir, exist_ok=True)

    raw_path = os.path.join(source_dir, "mysuru_wards_source_arcgis.json")
    with open(raw_path, "w", encoding="utf-8") as f:
        json.dump(raw_data, f, indent=2)
    print(f"Saved raw unmodified data to {raw_path}")

    # Extract layer
    layer = raw_data['operationalLayers'][0]['featureCollection']['layers'][0]
    features = layer['featureSet']['features']
    print(f"Found {len(features)} ward features")

    geojson_features = []
    for f in features:
        attrs = f['attributes']
        ward_no = int(attrs.get('Ward_No') or attrs.get('Ward_Numbe'))
        ward_name = str(attrs.get('Wards_Name', '')).strip()
        pop_2001 = attrs.get('T_P_2001')
        pop_2011 = attrs.get('T_P_2011')

        rings = f['geometry']['rings']
        converted_rings = convert_rings(rings)

        poly = Polygon(converted_rings[0], converted_rings[1:] if len(converted_rings) > 1 else [])
        if not poly.is_valid:
            poly = poly.buffer(0)

        geom_json = mapping(poly)

        geojson_features.append({
            "type": "Feature",
            "properties": {
                "ward_id": ward_no,
                "ward_number": ward_no,
                "ward_name": ward_name,
                "population_2001": pop_2001,
                "population_2011": pop_2011,
                "city": "Mysuru",
                "state": "Karnataka",
                "source": "Mysuru City Corporation Municipal Ward Boundaries"
            },
            "geometry": geom_json
        })

    # Sort by ward_number
    geojson_features.sort(key=lambda x: x['properties']['ward_number'])

    fc = {
        "type": "FeatureCollection",
        "name": "mysuru_wards",
        "crs": {
            "type": "name",
            "properties": {
                "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
            }
        },
        "features": geojson_features
    }

    geojson_path = os.path.join(data_dir, "mysuru_wards.geojson")
    with open(geojson_path, "w", encoding="utf-8") as f:
        json.dump(fc, f, indent=2)
    print(f"Successfully generated verified WGS84 GeoJSON: {geojson_path}")
    print(f"Total wards: {len(geojson_features)}")
    sample_names = [f['properties']['ward_name'] for f in geojson_features[:8]]
    print(f"Sample wards: {sample_names}")

if __name__ == "__main__":
    main()
