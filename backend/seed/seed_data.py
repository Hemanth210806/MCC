import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import json
import random
from datetime import datetime, timedelta
from shapely.geometry import shape, Point
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.ward import Ward
from app.models.department import Department, Category, CategoryDepartmentMap
from app.models.important_location import ImportantLocation
from app.models.complaint import Complaint, ComplaintImage, ComplaintStatusHistory, Feedback
from app.models.evidence import ResolutionEvidence
from app.models.analytics import SlaRule, Hotspot, RecurringIssue, AuditLog
from app.utils.id_generator import generate_complaint_code
from app.utils.geo import haversine_distance_meters
from app.services.hotspot_service import hotspot_service

def generate_point_in_polygon(polygon):
    minx, miny, maxx, maxy = polygon.bounds
    for _ in range(100):
        p = Point(random.uniform(minx, maxx), random.uniform(miny, maxy))
        if polygon.contains(p):
            return p.y, p.x  # lat, lng
    return (miny + maxy) / 2.0, (minx + maxx) / 2.0

def seed_database(app=None):
    if not app:
        try:
            from flask import current_app
            if current_app:
                app = current_app._get_current_object()
        except Exception:
            pass
    if not app:
        app = create_app('production')

    with app.app_context():
        db.create_all()
        from app.models.user import User
        if User.query.filter_by(email='admin@mcc.gov.in').first():
            print("Admin user already exists. Database already populated.")
            return

        print("Populating database tables...")
        backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

        # 1. Seed SLA Rules
        sla_high = SlaRule(priority='HIGH', target_hours=24)
        sla_med = SlaRule(priority='MEDIUM', target_hours=72)
        sla_low = SlaRule(priority='LOW', target_hours=168)
        db.session.add_all([sla_high, sla_med, sla_low])

        # 2. Seed 4 Departments
        dept_swm = Department(name="Solid Waste Management", description="Handles garbage collection, street sweeping, dump sites, and waste processing.")
        dept_roads = Department(name="Roads & Infrastructure", description="Handles road repairs, potholes, pavements, and civil maintenance.")
        dept_elec = Department(name="Electrical & Street Lighting", description="Handles streetlights, high-mast lamps, poles, and public illumination.")
        dept_water = Department(name="Water Supply & Sewerage", description="Handles water pipelines, leakages, valves, drainage, and sewage.")
        db.session.add_all([dept_swm, dept_roads, dept_elec, dept_water])
        db.session.commit()

        # 3. Seed 4 Categories & Mappings
        cat_garbage = Category(name="Garbage / Waste", description="Accumulated municipal solid waste, overflowing bins, open dumping, and litter.")
        cat_pothole = Category(name="Pothole / Road Damage", description="Road surface craters, broken asphalt, cave-ins, and road infrastructure hazards.")
        cat_light = Category(name="Streetlight Failure", description="Non-functional streetlights, broken fixtures, damaged poles, and dark stretches.")
        cat_water = Category(name="Water Leakage", description="Burst water mains, leaking supply pipes, faulty hydrants, and municipal water waste.")
        db.session.add_all([cat_garbage, cat_pothole, cat_light, cat_water])
        db.session.commit()

        # Mappings
        m1 = CategoryDepartmentMap(category_id=cat_garbage.id, department_id=dept_swm.id)
        m2 = CategoryDepartmentMap(category_id=cat_pothole.id, department_id=dept_roads.id)
        m3 = CategoryDepartmentMap(category_id=cat_light.id, department_id=dept_elec.id)
        m4 = CategoryDepartmentMap(category_id=cat_water.id, department_id=dept_water.id)
        db.session.add_all([m1, m2, m3, m4])
        db.session.commit()

        # 4. Seed Real MCC Wards
        wards_geojson_path = os.path.join(backend_dir, 'data', 'mysuru_wards.geojson')
        with open(wards_geojson_path, 'r', encoding='utf-8') as f:
            wards_data = json.load(f)

        ward_objects = []
        ward_polys = {}
        for feat in wards_data.get('features', []):
            props = feat['properties']
            w_no = props['ward_number']
            w_name = props['ward_name']
            poly_shape = shape(feat['geometry'])

            ward = Ward(
                ward_number=w_no,
                ward_name=w_name,
                geometry=feat['geometry']
            )
            ward_objects.append(ward)
            ward_polys[w_no] = poly_shape

        db.session.add_all(ward_objects)
        db.session.commit()
        print(f"Loaded {len(ward_objects)} real MCC wards into database.")

        # 5. Seed Users: Admin, Field Officers, and Ward Corporators
        # Admin
        admin = User(name="MCC Administrator", email="admin@mcc.gov.in", phone="9880012345", role="admin")
        admin.set_password("Admin@123")
        db.session.add(admin)

        # Field Officers (2 per department)
        officers = [
            ("Ramesh Kumar", "swm.officer@mcc.gov.in", "9880022001", dept_swm.id),
            ("Pooja Nair", "swm.lead@mcc.gov.in", "9880022002", dept_swm.id),
            ("Suresh Gowda", "roads.officer@mcc.gov.in", "9880033001", dept_roads.id),
            ("Anand Murthy", "roads.engineer@mcc.gov.in", "9880033002", dept_roads.id),
            ("Vijay Bhaskar", "elec.officer@mcc.gov.in", "9880044001", dept_elec.id),
            ("Shwetha Rao", "elec.lead@mcc.gov.in", "9880044002", dept_elec.id),
            ("Manjunath Swamy", "water.officer@mcc.gov.in", "9880055001", dept_water.id),
            ("Girish Patil", "water.engineer@mcc.gov.in", "9880055002", dept_water.id)
        ]
        officer_objs = []
        for name, email, phone, d_id in officers:
            u = User(name=name, email=email, phone=phone, role="field_officer", department_id=d_id)
            u.set_password("Officer@123")
            officer_objs.append(u)
            db.session.add(u)

        db.session.commit()

        # Corporator per real ward (65 corporators)
        for w in ward_objects:
            c_name = f"Corporator {w.ward_name}"
            c_email = f"ward{w.ward_number}.corporator@mcc.gov.in"
            c_phone = f"988{w.ward_number:02d}90000"
            corp = User(name=c_name, email=c_email, phone=c_phone, role="corporator", ward_id=w.id)
            corp.set_password("Corporator@123")
            db.session.add(corp)
            db.session.flush()
            w.corporator_user_id = corp.id

        db.session.commit()
        print("Seeded staff: 1 Admin, 8 Field Officers, 65 Corporators.")

        # 6. Seed Important Locations
        imp_places_path = os.path.join(backend_dir, 'data', 'important_places.geojson')
        with open(imp_places_path, 'r', encoding='utf-8') as f:
            imp_data = json.load(f)

        for feat in imp_data.get('features', []):
            props = feat['properties']
            coords = feat['geometry']['coordinates']
            loc = ImportantLocation(
                name=props['name'],
                type=props['type'],
                longitude=coords[0],
                latitude=coords[1]
            )
            db.session.add(loc)
        db.session.commit()
        print("Seeded verified important places.")

        # 7. Seed ~100 realistic Demo Complaints with GPS inside real ward polygons
        # Categories list
        cats = [cat_garbage, cat_pothole, cat_light, cat_water]
        cat_depts = {
            cat_garbage.id: dept_swm.id,
            cat_pothole.id: dept_roads.id,
            cat_light.id: dept_elec.id,
            cat_water.id: dept_water.id
        }

        # Demo category photos for issues and field officer resolution
        cat_demo_photos = {
            cat_garbage.id: {
                'issue': 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600',
                'resolution': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600'
            },
            cat_pothole.id: {
                'issue': 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600',
                'resolution': 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600'
            },
            cat_light.id: {
                'issue': 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600',
                'resolution': 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600'
            },
            cat_water.id: {
                'issue': 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600',
                'resolution': 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600'
            }
        }

        # Create sample demo photos in uploads as local fallbacks
        upload_img_dir = os.path.join(backend_dir, 'app', 'static', 'uploads', 'complaints')
        res_img_dir = os.path.join(backend_dir, 'app', 'static', 'uploads', 'resolutions')
        os.makedirs(upload_img_dir, exist_ok=True)
        os.makedirs(res_img_dir, exist_ok=True)

        demo_img_path = os.path.join(upload_img_dir, "demo_issue.jpg")
        demo_res_path = os.path.join(res_img_dir, "demo_resolution.jpg")

        from PIL import Image, ImageDraw
        im = Image.new("RGB", (300, 300), color=(70, 130, 180))
        d = ImageDraw.Draw(im)
        d.text((40, 140), "MCC CIVIC REPORT [DEMO]", fill=(255, 255, 255))
        im.save(demo_img_path)

        im_res = Image.new("RGB", (300, 300), color=(46, 139, 87))
        d_res = ImageDraw.Draw(im_res)
        d_res.text((40, 140), "MCC RESOLVED EVIDENCE", fill=(255, 255, 255))
        im_res.save(demo_res_path)

        now = datetime.utcnow()
        complaint_records = []

        # Target 95 complaints
        for i in range(1, 96):
            w = random.choice(ward_objects[:25])  # concentrate in first 25 urban wards for hotspots
            w_poly = ward_polys[w.ward_number]
            lat, lng = generate_point_in_polygon(w_poly)

            cat = random.choice(cats)
            dept_id = cat_depts[cat.id]

            # Priority assignment
            pri = random.choices(['HIGH', 'MEDIUM', 'LOW'], weights=[0.25, 0.50, 0.25])[0]
            pri_score = 80 if pri == 'HIGH' else (55 if pri == 'MEDIUM' else 30)

            # Varied statuses: some resolved, some in progress, some overdue, some submitted
            if i <= 25:
                status = 'RESOLVED'
                created_ago = timedelta(days=random.randint(5, 45))
            elif i <= 45:
                status = 'IN_PROGRESS'
                created_ago = timedelta(days=random.randint(1, 4))
            elif i <= 60:
                status = 'VERIFICATION_PENDING'
                created_ago = timedelta(days=random.randint(1, 3))
            elif i <= 75:
                status = 'OVERDUE'
                created_ago = timedelta(days=random.randint(4, 10))
            else:
                status = 'ASSIGNED'
                created_ago = timedelta(hours=random.randint(2, 20))

            created_time = now - created_ago
            due_hours = 24 if pri == 'HIGH' else (72 if pri == 'MEDIUM' else 168)
            due_time = created_time + timedelta(hours=due_hours)

            # Reasons
            reasons = [f"Base severity for {cat.name}"]
            if pri == 'HIGH':
                reasons.append("Proximity to educational/medical institution (<200m)")
                reasons.append("Clustered civic reports in vicinity")

            c_code = f"MCC-2026-{i:05d}"
            c = Complaint(
                complaint_code=c_code,
                citizen_name=f"Citizen {i}",
                citizen_phone=f"98450{i:05d}",
                citizen_email=f"citizen{i}@example.com",
                description=f"[DEMO] Reported {cat.name} near main road in {w.ward_name}",
                category_id=cat.id,
                ai_predicted_category_id=cat.id,
                ai_confidence=round(random.uniform(0.72, 0.98), 2),
                ai_low_confidence=False,
                ai_classification_status='CLASSIFIED',
                ai_model_version="MobileNetV2-TransferLearning-v1.0",
                latitude=lat,
                longitude=lng,
                gps_accuracy_m=round(random.uniform(3.0, 12.0), 1),
                ward_id=w.id,
                department_id=dept_id,
                priority=pri,
                priority_score=pri_score,
                priority_reasons=reasons,
                status=status,
                sla_due_at=due_time,
                is_demo_data=True,
                created_at=created_time,
                updated_at=now - timedelta(hours=random.randint(1, 24))
            )
            db.session.add(c)
            db.session.flush()

            # Category-specific authentic Image
            issue_photo = cat_demo_photos.get(cat.id, {}).get('issue', '/static/uploads/complaints/demo_issue.jpg')
            img = ComplaintImage(complaint_id=c.id, image_path=issue_photo)
            db.session.add(img)

            # Timeline
            h1 = ComplaintStatusHistory(complaint_id=c.id, old_status=None, new_status='SUBMITTED', created_at=created_time)
            h2 = ComplaintStatusHistory(complaint_id=c.id, old_status='SUBMITTED', new_status='ASSIGNED', created_at=created_time + timedelta(minutes=5))
            db.session.add_all([h1, h2])

            # Resolution evidence for resolved / verification pending
            if status in ('RESOLVED', 'VERIFICATION_PENDING'):
                res_lat = lat + random.uniform(-0.0001, 0.0001)
                res_lng = lng + random.uniform(-0.0001, 0.0001)
                dist_m = haversine_distance_meters(lat, lng, res_lat, res_lng)
                officer = random.choice(officer_objs)
                res_photo = cat_demo_photos.get(cat.id, {}).get('resolution', '/static/uploads/resolutions/demo_resolution.jpg')

                ev = ResolutionEvidence(
                    complaint_id=c.id,
                    officer_id=officer.id,
                    photo_path=res_photo,
                    latitude=res_lat,
                    longitude=res_lng,
                    gps_accuracy_m=4.5,
                    distance_from_original_m=dist_m,
                    submitted_at=created_time + timedelta(hours=random.randint(6, 20)),
                    verified_by_admin_id=admin.id if status == 'RESOLVED' else None,
                    verification_status='approved' if status == 'RESOLVED' else 'pending',
                    verification_notes="Verified against original photo and GPS" if status == 'RESOLVED' else None,
                    verified_at=now - timedelta(hours=2) if status == 'RESOLVED' else None
                )
                db.session.add(ev)

                # Feedback for resolved
                if status == 'RESOLVED' and i % 2 == 0:
                    fb = Feedback(
                        complaint_id=c.id,
                        rating=random.randint(4, 5),
                        comment="Issue was addressed promptly. Satisfied with MCC response.",
                        created_at=now - timedelta(hours=1)
                    )
                    db.session.add(fb)

            complaint_records.append(c)

        db.session.commit()
        print(f"Seeded {len(complaint_records)} realistic demo complaints.")

        # 8. Create recurring issue demo pair: near the same spot
        resolved_c = Complaint.query.filter_by(status='RESOLVED').first()
        if resolved_c:
            new_recur = Complaint(
                complaint_code="MCC-2026-00096",
                citizen_name="Citizen Recurrence",
                citizen_phone="9845099999",
                citizen_email="citizen.recur@example.com",
                description="[DEMO] Recurring garbage accumulation reported at same spot.",
                category_id=resolved_c.category_id,
                ai_predicted_category_id=resolved_c.category_id,
                ai_confidence=0.91,
                ai_classification_status='CLASSIFIED',
                ai_model_version="MobileNetV2-TransferLearning-v1.0",
                latitude=resolved_c.latitude + 0.0001,
                longitude=resolved_c.longitude + 0.0001,
                ward_id=resolved_c.ward_id,
                department_id=resolved_c.department_id,
                priority='HIGH',
                priority_score=85,
                priority_reasons=["Recurring civic issue detected (<25m from previously resolved complaint)", "Solid waste accumulation"],
                status='ASSIGNED',
                sla_due_at=now + timedelta(hours=24),
                is_demo_data=True
            )
            db.session.add(new_recur)
            db.session.flush()

            dist = haversine_distance_meters(resolved_c.latitude, resolved_c.longitude, new_recur.latitude, new_recur.longitude)
            rec = RecurringIssue(
                previous_complaint_id=resolved_c.id,
                new_complaint_id=new_recur.id,
                distance_m=dist,
                category_id=resolved_c.category_id,
                detected_at=now
            )
            db.session.add(rec)
            db.session.commit()
            print("Seeded recurring issue demonstration record.")

        # 9. Run Hotspot clustering
        print("Calculating civic hotspots using DBSCAN...")
        hotspots_count = hotspot_service.recalculate_hotspots()
        print(f"DBSCAN detected {hotspots_count} active hotspots.")

        print("\n=======================================================")
        print("           MYSURU CIVIC CONNECT (MCC) SEED COMPLETE")
        print("=======================================================")
        print("Demo Login Credentials:")
        print("-------------------------------------------------------")
        print("1. Admin:")
        print("   Email:    admin@mcc.gov.in")
        print("   Password: Admin@123")
        print("")
        print("2. Field Officers:")
        print("   SWM:        swm.officer@mcc.gov.in       | Officer@123")
        print("   Roads:      roads.officer@mcc.gov.in     | Officer@123")
        print("   Electrical: elec.officer@mcc.gov.in      | Officer@123")
        print("   Water:      water.officer@mcc.gov.in     | Officer@123")
        print("")
        print("3. Ward Corporators (65 real wards):")
        print("   Ward 1:  ward1.corporator@mcc.gov.in     | Corporator@123")
        print("   Ward 12: ward12.corporator@mcc.gov.in    | Corporator@123")
        print("   Ward 15: ward15.corporator@mcc.gov.in    | Corporator@123")
        print("=======================================================\n")

if __name__ == '__main__':
    seed_database()
