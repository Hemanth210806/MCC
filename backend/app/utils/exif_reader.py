import os
from typing import Optional, Tuple, Dict, Any
from PIL import Image, ExifTags

def _convert_to_degrees(value) -> float:
    d0 = value[0]
    d = float(d0[0]) / float(d0[1]) if isinstance(d0, tuple) else float(d0)

    m0 = value[1]
    m = float(m0[0]) / float(m0[1]) if isinstance(m0, tuple) else float(m0)

    s0 = value[2]
    s = float(s0[0]) / float(s0[1]) if isinstance(s0, tuple) else float(s0)

    return d + (m / 60.0) + (s / 3600.0)

def extract_exif_gps(image_path: str) -> Dict[str, Any]:
    result = {
        'has_gps': False,
        'latitude': None,
        'longitude': None,
        'datetime': None
    }

    if not os.path.exists(image_path):
        return result

    try:
        with Image.open(image_path) as img:
            exif_raw = img._getexif()
            if not exif_raw:
                return result

            gps_info = {}
            datetime_str = None

            for tag_id, value in exif_raw.items():
                tag_name = ExifTags.TAGS.get(tag_id, tag_id)
                if tag_name == 'GPSInfo':
                    for key in value:
                        sub_tag = ExifTags.GPSTAGS.get(key, key)
                        gps_info[sub_tag] = value[key]
                elif tag_name in ('DateTimeOriginal', 'DateTimeDigitized', 'DateTime'):
                    if not datetime_str:
                        datetime_str = str(value)

            if gps_info:
                lat_raw = gps_info.get('GPSLatitude')
                lat_ref = gps_info.get('GPSLatitudeRef', 'N')
                lon_raw = gps_info.get('GPSLongitude')
                lon_ref = gps_info.get('GPSLongitudeRef', 'E')

                if lat_raw and lon_raw:
                    lat = _convert_to_degrees(lat_raw)
                    if lat_ref != 'N':
                        lat = -lat

                    lon = _convert_to_degrees(lon_raw)
                    if lon_ref != 'E':
                        lon = -lon

                    result['has_gps'] = True
                    result['latitude'] = round(lat, 6)
                    result['longitude'] = round(lon, 6)

            result['datetime'] = datetime_str
            return result
    except Exception as e:
        return result
