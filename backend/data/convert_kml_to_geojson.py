import os
import json
import xml.etree.ElementTree as ET
from shapely.geometry import Polygon, mapping

def convert_kml():
    data_dir = os.path.abspath(os.path.dirname(__file__))
    kml_path = os.path.join(data_dir, 'opencity_wards.kml')
    geojson_path = os.path.join(data_dir, 'mysuru_wards.geojson')

    if not os.path.exists(kml_path):
        raise FileNotFoundError(f"KML file not found at {kml_path}")

    tree = ET.parse(kml_path)
    root = tree.getroot()
    placemarks = root.findall('.//{http://www.opengis.net/kml/2.2}Placemark')
    if not placemarks:
        placemarks = root.findall('.//Placemark')

    features = []
    for pm in placemarks:
        ext = pm.find('{http://www.opengis.net/kml/2.2}ExtendedData')
        ext_data = {}
        if ext is not None:
            for data in ext.findall('.//{http://www.opengis.net/kml/2.2}SimpleData'):
                ext_data[data.attrib.get('name')] = data.text

        ward_num = int(ext_data.get('KGISWardNo'))
        ward_name = ext_data.get('KGISWardName', f"Ward {ward_num}").strip()

        # Coordinates parsing
        coords_el = pm.find('.//{http://www.opengis.net/kml/2.2}coordinates')
        if coords_el is None:
            continue

        raw_pairs = coords_el.text.strip().split()
        ring = []
        for pair in raw_pairs:
            parts = pair.split(',')
            lng = round(float(parts[0]), 7)
            lat = round(float(parts[1]), 7)
            ring.append((lng, lat))

        if len(ring) < 3:
            continue

        # Close ring if not closed
        if ring[0] != ring[-1]:
            ring.append(ring[0])

        poly = Polygon(ring)
        if not poly.is_valid:
            poly = poly.buffer(0)

        feat = {
            'type': 'Feature',
            'id': ward_num,
            'properties': {
                'ward_id': ward_num,
                'ward_number': ward_num,
                'ward_name': ward_name,
                'kgis_ward_code': ext_data.get('KGISWardCode', f"2605{ward_num:03d}"),
                'kgis_ward_id': ext_data.get('KGISWardID', str(6350 + ward_num)),
                'lgd_ward_code': ext_data.get('LGD_WardCode', str(28800 + ward_num))
            },
            'geometry': mapping(poly)
        }
        features.append(feat)

    features.sort(key=lambda f: f['properties']['ward_number'])
    feature_collection = {
        'type': 'FeatureCollection',
        'features': features
    }

    with open(geojson_path, 'w', encoding='utf-8') as f:
        json.dump(feature_collection, f, indent=2, ensure_ascii=False)

    print(f"Successfully converted {len(features)} official MCC wards to {geojson_path}")

if __name__ == '__main__':
    convert_kml()
