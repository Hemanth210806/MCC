import re
import random

def normalize_worker_name(value: str) -> str:
    """Normalize ward names for email and identifier slugs."""
    if not value:
        return "ward"
    return re.sub(r"_+", "_", re.sub(r"[^a-z0-9]+", "_", value.lower())).strip("_")

# Curated Indian names pool:
# Generates exactly 260 unique, authentic Indian names (182 male = 70%, 78 female = 30%)
MALE_FIRST_NAMES = [
    "Rajesh", "Suresh", "Ramesh", "Manjunath", "Venkatesh", "Ganesh", "Ravi", "Sunil",
    "Vijay", "Karthik", "Anand", "Harish", "Praveen", "Kiran", "Sachin", "Chethan",
    "Darshan", "Naveen", "Bharath", "Sandeep", "Raghu", "Manoj", "Prashanth", "Vinod",
    "Deepak", "Arun", "Ajay", "Mahesh", "Santosh", "Shashidhar", "Chandrashekar", "Lokesh",
    "Jagadeesh", "Shivakumar", "Basavaraj", "Mallikarjun", "Nagaraj", "Siddaraju",
    "Mahadevaswamy", "Somesh", "Girish", "Guruprasad", "Raghavendra", "Sathish",
    "Nagesh", "Madhusudan", "Mohan", "Ashok", "Dinesh", "Sridhar", "Gopal", "Krishna",
    "Subhash", "Rohit", "Abhishek", "Varun", "Tejas", "Adarsh", "Yashwanth", "Chandan"
]

FEMALE_FIRST_NAMES = [
    "Priya", "Lakshmi", "Deepa", "Shwetha", "Kavitha", "Ananya", "Pooja", "Rekha",
    "Sneha", "Divya", "Sunitha", "Roopa", "Geetha", "Meena", "Sowmya", "Vidya",
    "Bhavya", "Ashwini", "Preethi", "Shilpa", "Rashmi", "Sushma", "Nandini", "Pallavi",
    "Chaithra", "Archana", "Madhuri", "Swathi", "Shruthi", "Pavithra", "Mamatha", "Hemalatha"
]

SURNAMES = [
    "Gowda", "Kumar", "Swamy", "Prasad", "Rao", "Murthy", "Nayak", "Shettar",
    "Patil", "Hegde", "Sharma", "Verma", "Singh", "Joshi", "Bhat", "Acharya",
    "Reddy", "Naidu", "Shetty", "Pai", "Kulkarni", "Deshmukh", "Mishra", "Iyengar"
]

def _generate_deterministic_indian_names():
    """Builds a deterministic 260-name list with 70% male and 30% female distribution."""
    rng = random.Random(42)

    male_pool = [f"{fn} {sn}" for fn in MALE_FIRST_NAMES for sn in SURNAMES]
    rng.shuffle(male_pool)
    selected_males = male_pool[:182]  # 70% of 260

    female_pool = [f"{fn} {sn}" for fn in FEMALE_FIRST_NAMES for sn in SURNAMES]
    rng.shuffle(female_pool)
    selected_females = female_pool[:78]  # 30% of 260

    # Interleave in 7-male, 3-female pattern for consistent distribution across all wards
    combined = []
    m_idx = 0
    f_idx = 0
    pattern = [True, True, False, True, True, False, True, True, True, False]
    for i in range(260):
        is_male = pattern[i % 10]
        if is_male and m_idx < len(selected_males):
            combined.append(selected_males[m_idx])
            m_idx += 1
        elif f_idx < len(selected_females):
            combined.append(selected_females[f_idx])
            f_idx += 1
        else:
            combined.append(selected_males[m_idx])
            m_idx += 1

    return combined

INDIAN_WORKER_NAMES = _generate_deterministic_indian_names()

DEPT_OFFSETS = {
    "waste": 0,
    "road": 1,
    "street": 2,
    "water": 3
}

def get_indian_worker_name(ward_number: int, ward_name: str, department_slug: str) -> str:
    """
    Returns worker name formatted as:
    Name (ward_slug_department_slug_worker)
    e.g. 'Raghavendra Iyengar (lakshmipuram_street_worker)'
    """
    slug = normalize_worker_name(ward_name)
    clean_dept = department_slug.lower().strip()
    offset = DEPT_OFFSETS.get(clean_dept, 0)
    w_num = max(1, ward_number or 1)
    idx = ((w_num - 1) * 4 + offset) % len(INDIAN_WORKER_NAMES)
    person_name = INDIAN_WORKER_NAMES[idx]
    return f"{person_name} ({slug}_{clean_dept}_worker)"

def update_all_worker_names_in_db():
    """
    Updates all existing ward workers in the database to have realistic Indian names
    matching the format: Name (ward_dept_worker).
    """
    from app.models.user import User
    from app.models.ward import Ward
    from app.models.department import Department
    from app.extensions import db

    dept_slug_map = {
        "Solid Waste Management": "waste",
        "Roads & Infrastructure": "road",
        "Electrical & Street Lighting": "street",
        "Water Supply & Sewerage": "water"
    }

    workers = User.query.filter_by(role="ward_worker").all()
    updated = False
    for worker in workers:
        ward = worker.ward if worker.ward_id else None
        department = worker.department if worker.department_id else None

        # Infer department slug
        dept_slug = dept_slug_map.get(department.name if department else "", "waste")
        if not department and worker.email:
            for s in ("waste", "road", "street", "water"):
                if f"_{s}@" in worker.email:
                    dept_slug = s
                    break

        if ward:
            w_num = ward.ward_number
            w_name = ward.ward_name
        else:
            # Try to infer ward from email
            w_num = 1
            w_name = "agrahara"
            if worker.email and "@" in worker.email:
                prefix = worker.email.split("@")[0]
                for s in ("_waste", "_road", "_street", "_water"):
                    prefix = prefix.replace(s, "")
                w_name = prefix

        expected_name = get_indian_worker_name(w_num, w_name, dept_slug)
        if worker.name != expected_name:
            worker.name = expected_name
            updated = True

    if updated:
        try:
            db.session.commit()
            print("[WorkerNames] Successfully updated worker names to Indian names with ward-department brackets.")
        except Exception as e:
            db.session.rollback()
            print(f"[WorkerNames] Rollback on updating worker names: {e}")

