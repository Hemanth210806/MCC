import os
import re

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def validate_phone(phone: str) -> bool:
    if not phone:
        return True
    cleaned = re.sub(r'[\s\-\+]', '', phone)
    return len(cleaned) >= 10 and cleaned.isdigit()

def validate_coordinates(lat: float, lon: float) -> bool:
    return -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0
