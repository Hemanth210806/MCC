from datetime import datetime
from app.extensions import db
from app.models.complaint import Complaint

def generate_complaint_code() -> str:
    year = datetime.utcnow().year
    prefix = f"MCC-{year}-"
    # Find the latest complaint code for this year
    latest = Complaint.query.filter(Complaint.complaint_code.like(f"{prefix}%")).order_by(Complaint.id.desc()).first()
    if latest and latest.complaint_code.startswith(prefix):
        try:
            num_part = latest.complaint_code.split('-')[-1]
            next_num = int(num_part) + 1
        except ValueError:
            next_num = 1
    else:
        # Fallback to total count + 1
        count = Complaint.query.count()
        next_num = count + 1

    return f"{prefix}{next_num:05d}"
