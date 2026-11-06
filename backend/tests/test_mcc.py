import os
import sys
import pytest
import io
from datetime import datetime, timedelta

# Ensure backend path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, backend_dir)

from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.ward import Ward
from app.models.department import Department, Category, CategoryDepartmentMap
from app.models.important_location import ImportantLocation
from app.models.complaint import Complaint, ComplaintImage, ComplaintStatusHistory
from app.models.analytics import SlaRule, Hotspot, RecurringIssue
from app.utils.geo import haversine_distance_meters
from app.utils.exif_reader import extract_exif_gps
from app.services.ward_lookup import ward_lookup_service
from app.services.priority_engine import priority_engine
from app.services.routing_service import routing_service
from app.services.sla_service import sla_service
from app.services.recurring_service import recurring_service
from app.services.hotspot_service import hotspot_service
from app.services.worker_assignment import select_worker
from seed.seed_data import (
    ensure_demo_workers,
    ensure_ward_department_workers,
    worker_email_for,
)
from app.routes.auth import generate_jwt
from ml.inference import CATEGORY_LABEL_MAP, normalize_label

@pytest.fixture
def app():
    app = create_app('testing')
    with app.app_context():
        db.create_all()

        # Seed minimal fixtures
        sla1 = SlaRule(priority='HIGH', target_hours=24)
        sla2 = SlaRule(priority='MEDIUM', target_hours=72)
        sla3 = SlaRule(priority='LOW', target_hours=168)
        db.session.add_all([sla1, sla2, sla3])

        dept1 = Department(name="Solid Waste Management", description="Waste")
        dept2 = Department(name="Roads & Infrastructure", description="Roads")
        dept3 = Department(name="Electrical & Street Lighting", description="Electrical")
        dept4 = Department(name="Water Supply & Sewerage", description="Water")
        db.session.add_all([dept1, dept2, dept3, dept4])
        db.session.commit()

        cat1 = Category(name="Garbage / Waste", description="Garbage")
        cat2 = Category(name="Pothole / Road Damage", description="Pothole")
        db.session.add_all([cat1, cat2])
        db.session.commit()

        m1 = CategoryDepartmentMap(category_id=cat1.id, department_id=dept1.id)
        m2 = CategoryDepartmentMap(category_id=cat2.id, department_id=dept2.id)
        db.session.add_all([m1, m2])

        # Hospital location for priority engine tests
        hosp = ImportantLocation(name="K.R. Hospital", type="hospital", latitude=12.3134, longitude=76.6508)
        school = ImportantLocation(name="Demonstration School", type="school", latitude=12.3082, longitude=76.6215)
        db.session.add_all([hosp, school])

        # Seed Wards for GIS lookup testing
        ward61 = Ward(ward_number=61, ward_name="Vidyaranyapuram", geometry={"type": "Polygon", "coordinates": []})
        ward62 = Ward(ward_number=62, ward_name="Vishweshwaranagara", geometry={"type": "Polygon", "coordinates": []})
        db.session.add_all([ward61, ward62])

        # Users
        admin = User(name="Test Admin", email="admin.test@mcc.gov.in", role="admin")
        admin.set_password("Pass@123")
        officer = User(name="Test Officer", email="officer.test@mcc.gov.in", role="field_officer", department_id=dept1.id)
        officer.set_password("Pass@123")
        worker = User(name="Test Ward Worker", email="worker.test@mcc.gov.in", role="ward_worker", department_id=dept1.id)
        worker.set_password("Pass@123")
        db.session.add_all([admin, officer, worker])
        db.session.commit()
        ensure_ward_department_workers()

        yield app

        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

# ----------------- 1. Ward Point-in-Polygon Tests -----------------
def test_geotagged_photo_exif_is_read():
    from PIL import Image, TiffImagePlugin

    img_path = os.path.join(os.path.dirname(__file__), 'tmp_geotag_test.jpg')
    exif = Image.Exif()
    exif[34853] = {
        1: 'N',
        2: (
            TiffImagePlugin.IFDRational(12, 1),
            TiffImagePlugin.IFDRational(30, 1),
            TiffImagePlugin.IFDRational(0, 1),
        ),
        3: 'E',
        4: (
            TiffImagePlugin.IFDRational(76, 1),
            TiffImagePlugin.IFDRational(39, 1),
            TiffImagePlugin.IFDRational(0, 1),
        ),
    }
    Image.new('RGB', (10, 10), color='blue').save(img_path, format='JPEG', exif=exif)

    res = extract_exif_gps(img_path)
    assert res['has_gps'] is True
    assert abs(res['latitude'] - 12.5) < 1e-6
    assert abs(res['longitude'] - 76.65) < 1e-6

    os.remove(img_path)


def test_real_ward_lookup():
    # Coords in J P Nagar (Ward 12): lat 12.2785, lng 76.6520
    res = ward_lookup_service.lookup(12.2785, 76.6520)
    assert res['outside_mcc_boundary'] is False
    assert res['ward_number'] is not None
    assert isinstance(res['ward_name'], str)

def test_outside_mcc_boundary():
    # Far coordinates outside Mysuru (e.g. Pacific ocean or Delhi)
    res = ward_lookup_service.lookup(28.6139, 77.2090)
    assert res['outside_mcc_boundary'] is True
    assert res['ward_number'] is None

# ----------------- 2. Haversine Distance Tests -----------------
def test_haversine_distance():
    # Mysore Palace (12.3051, 76.6551) to KR Hospital (12.3134, 76.6508) is ~1.0 km
    dist = haversine_distance_meters(12.3051, 76.6551, 12.3134, 76.6508)
    assert 900 < dist < 1200

def test_zero_distance():
    dist = haversine_distance_meters(12.3051, 76.6551, 12.3051, 76.6551)
    assert round(dist, 2) == 0.0

# ----------------- 3. Priority Engine Tests -----------------
def test_priority_engine_near_hospital(app):
    with app.app_context():
        # Point right next to KR Hospital (within 50m)
        res = priority_engine.compute_priority(
            category_name="Pothole / Road Damage",
            latitude=12.3135,
            longitude=76.6508,
            similar_nearby_count=0
        )
        assert res['priority'] == 'HIGH'
        assert res['score'] >= 70
        assert any('Within 100m of K.R. Hospital' in r for r in res['reasons'])

def test_priority_engine_low_severity(app):
    with app.app_context():
        # Point far from any school/hospital/transit with 0 similar
        res = priority_engine.compute_priority(
            category_name="Streetlight Failure",
            latitude=12.2500,
            longitude=76.6000,
            similar_nearby_count=0
        )
        assert res['priority'] == 'LOW'
        assert res['score'] < 40

# ----------------- 4. Category Routing Tests -----------------
def test_routing_service(app):
    with app.app_context():
        cat_g = Category.query.filter_by(name="Garbage / Waste").first()
        dept = routing_service.get_department_for_category(cat_g.id)
        assert dept.name == "Solid Waste Management"

def test_complaint_serializes_assigned_worker_phone(app):
    with app.app_context():
        worker = User.query.filter_by(email="worker.test@mcc.gov.in").first()
        worker.phone = "9880099999"
        complaint = Complaint(
            complaint_code="MCC-2026-WORKER-PHONE",
            latitude=12.30,
            longitude=76.65,
            assigned_worker=worker,
        )
        db.session.add(complaint)
        db.session.commit()

        data = complaint.to_dict()
        assert data["assigned_worker_name"] == "Test Ward Worker"
        assert data["assigned_worker_phone"] == "9880099999"

def test_demo_workers_are_available_and_idempotent(app):
    with app.app_context():
        # Add the production-style dependencies to the minimal test database.
        swm = Department.query.filter_by(name="Solid Waste Management").one()
        roads = Department.query.filter_by(name="Roads & Infrastructure").one()
        agrahara = Ward(ward_number=100, ward_name="Agrahara", geometry={"type": "Polygon", "coordinates": []})
        vidyaranyapuram = Ward.query.filter_by(ward_name="Vidyaranyapuram").one()
        db.session.add(agrahara)
        db.session.commit()

        ensure_demo_workers()
        ensure_demo_workers()

        agrahara_worker = User.query.filter_by(email="agrahara.worker@mcc.gov.in").one()
        vidyaranyapuram_worker = User.query.filter_by(email="vidhya.worker@mcc.gov.in").one()
        assert agrahara_worker.phone == "9880022102"
        assert agrahara_worker.ward_id == agrahara.id
        assert agrahara_worker.department_id == swm.id
        assert vidyaranyapuram_worker.phone == "9880033102"
        assert vidyaranyapuram_worker.ward_id == vidyaranyapuram.id
        assert vidyaranyapuram_worker.department_id == roads.id
        assert User.query.filter_by(email="agrahara.worker@mcc.gov.in").count() == 1

def test_worker_assignment_prefers_free_nearby_worker_and_releases_resolved_worker(app):
    with app.app_context():
        department = Department.query.filter_by(name="Solid Waste Management").one()
        source_ward = Ward.query.filter_by(ward_number=61).one()
        nearby_ward = Ward.query.filter_by(ward_number=62).one()
        source_ward.geometry = {
            "type": "Polygon",
            "coordinates": [[[76.64, 12.30], [76.65, 12.30], [76.65, 12.31], [76.64, 12.31], [76.64, 12.30]]],
        }
        nearby_ward.geometry = {
            "type": "Polygon",
            "coordinates": [[[76.65, 12.30], [76.66, 12.30], [76.66, 12.31], [76.65, 12.31], [76.65, 12.30]]],
        }
        db.session.commit()

        source_worker = User.query.filter_by(
            ward_id=source_ward.id, department_id=department.id, role="ward_worker"
        ).one()
        nearby_worker = User.query.filter_by(
            ward_id=nearby_ward.id, department_id=department.id, role="ward_worker"
        ).one()
        busy_complaint = Complaint(
            complaint_code="MCC-2026-BUSY-WORKER",
            latitude=12.305,
            longitude=76.645,
            ward_id=source_ward.id,
            department_id=department.id,
            assigned_worker_id=source_worker.id,
            status="IN_PROGRESS",
        )
        db.session.add(busy_complaint)
        db.session.commit()

        selected = select_worker(source_ward, department, 12.305, 76.645)
        assert selected.id == nearby_worker.id

        busy_complaint.status = "VERIFICATION_PENDING"
        db.session.commit()
        selected = select_worker(source_ward, department, 12.305, 76.645)
        assert selected.id == source_worker.id

        busy_complaint.status = "IN_PROGRESS"
        nearby_complaint = Complaint(
            complaint_code="MCC-2026-BUSY-NEARBY",
            latitude=12.305,
            longitude=76.655,
            ward_id=nearby_ward.id,
            department_id=department.id,
            assigned_worker_id=nearby_worker.id,
            status="IN_PROGRESS",
        )
        db.session.add(nearby_complaint)
        db.session.commit()
        selected = select_worker(source_ward, department, 12.305, 76.645)
        assert selected.id == source_worker.id

# ----------------- 5. SLA Due Date & Transition Tests -----------------
def test_sla_due_date(app):
    with app.app_context():
        now = datetime.utcnow()
        due_high = sla_service.calculate_due_date('HIGH', now)
        assert abs((due_high - now).total_seconds() - 24 * 3600) < 5

def test_valid_status_transitions(app):
    with app.app_context():
        c = Complaint(
            complaint_code="MCC-2026-TEST1",
            latitude=12.30,
            longitude=76.65,
            status="SUBMITTED"
        )
        db.session.add(c)
        db.session.commit()

        # Valid: SUBMITTED -> ASSIGNED
        sla_service.transition_status(c, "ASSIGNED", remarks="Assigned")
        assert c.status == "ASSIGNED"

        # Valid: ASSIGNED -> IN_PROGRESS
        sla_service.transition_status(c, "IN_PROGRESS", remarks="Started")
        assert c.status == "IN_PROGRESS"

        # Invalid: IN_PROGRESS -> RESOLVED directly without verification
        with pytest.raises(ValueError):
            sla_service.transition_status(c, "RESOLVED")

# ----------------- 6. Recurring Issue Detection -----------------
def test_recurring_issue_detection(app):
    with app.app_context():
        c1 = Complaint(
            complaint_code="MCC-2026-PAST",
            category_id=1,
            latitude=12.3000,
            longitude=76.6500,
            status="RESOLVED",
            updated_at=datetime.utcnow() - timedelta(days=10)
        )
        db.session.add(c1)
        db.session.commit()

        # New complaint at virtually identical location (<20m)
        c2 = Complaint(
            complaint_code="MCC-2026-NEW",
            category_id=1,
            latitude=12.3001,
            longitude=76.6500,
            status="SUBMITTED"
        )
        db.session.add(c2)
        db.session.commit()

        recurring = recurring_service.check_and_record_recurring(c2)
        assert recurring is not None
        assert recurring.distance_m < 50
        assert recurring.previous_complaint_id == c1.id

# ----------------- 7. RBAC & Auth Enforcement -----------------
def test_officer_cannot_access_admin_queue(client, app):
    with app.app_context():
        officer = User.query.filter_by(role='field_officer').first()
        token = generate_jwt(officer)
        res = client.get('/api/admin/verification-queue', headers={'Authorization': f'Bearer {token}'})
        assert res.status_code == 403
        assert 'Access forbidden' in res.get_json()['error']

def test_admin_can_access_admin_queue(client, app):
    with app.app_context():
        admin = User.query.filter_by(role='admin').first()
        token = generate_jwt(admin)
        res = client.get('/api/admin/verification-queue', headers={'Authorization': f'Bearer {token}'})
        assert res.status_code == 200

def test_admin_assigns_worker_and_worker_updates_only_owned_complaint(client, app):
    with app.app_context():
        admin = User.query.filter_by(role='admin').first()
        worker = User.query.filter_by(role='ward_worker').first()
        dept = Department.query.first()
        complaint = Complaint(
            complaint_code='MCC-2026-WORKER', latitude=12.30, longitude=76.65,
            department_id=dept.id, status='ASSIGNED', priority='MEDIUM'
        )
        db.session.add(complaint)
        db.session.commit()
        admin_token = generate_jwt(admin)
        worker_token = generate_jwt(worker)
        complaint_id = complaint.id

    assigned = client.patch(
        f'/api/admin/complaints/{complaint_id}/assign-worker',
        json={'worker_id': worker.id},
        headers={'Authorization': 'Bearer ' + admin_token}
    )
    assert assigned.status_code == 200

    progress = client.patch(
        f'/api/officer/complaints/{complaint_id}/progress',
        json={'progress_percent': 40, 'progress_note': 'Crew dispatched'},
        headers={'Authorization': 'Bearer ' + worker_token}
    )
    assert progress.status_code == 200
    assert progress.get_json()['complaint']['progress_percent'] == 40

    with app.app_context():
        other = Complaint(
            complaint_code='MCC-2026-NOT-OWNED', latitude=12.31, longitude=76.65,
            department_id=Department.query.first().id, status='ASSIGNED'
        )
        db.session.add(other)
        db.session.commit()
        other_id = other.id
    denied = client.patch(
        f'/api/officer/complaints/{other_id}/progress',
        json={'progress_percent': 10},
        headers={'Authorization': 'Bearer ' + worker_token}
    )
    assert denied.status_code == 403

# ----------------- 8. Same-Location Duplicate Merge Safety -----------------
def test_same_location_report_updates_stale_road_damage_to_waste(client, app, monkeypatch):
    with app.app_context():
        stale = Complaint(
            complaint_code='MCC-2026-EXISTING',
            citizen_name='Existing User',
            citizen_phone='9845012345',
            description='Old stale road damage record',
            category_id=Category.query.filter_by(name='Pothole / Road Damage').first().id,
            ai_predicted_category_id=Category.query.filter_by(name='Pothole / Road Damage').first().id,
            latitude=12.2785,
            longitude=76.6520,
            ward_id=Ward.query.filter_by(ward_number=61).first().id,
            status='SUBMITTED',
            report_count=1,
            priority='MEDIUM',
            is_demo_data=False,
        )
        db.session.add(stale)
        db.session.commit()

    monkeypatch.setattr('app.services.classification_service.classification_service.classify_image', lambda image_path: {'category_name': 'Garbage_Waste', 'confidence': 0.94, 'low_confidence': False, 'status': 'CLASSIFIED', 'model_version': 'test'})

    img = io.BytesIO()
    from PIL import Image
    Image.new('RGB', (100, 100), color='blue').save(img, format='JPEG')
    img.seek(0)

    res = client.post('/api/complaints', data={
        'photo': (img, 'same_spot_waste.jpg'),
        'latitude': '12.27855',
        'longitude': '76.6520',
        'citizen_phone': '9845099999',
        'description': 'Same location, but actual issue is garbage and waste'
    }, content_type='multipart/form-data')

    assert res.status_code == 200
    payload = res.get_json()
    assert payload['merged'] is True
    assert payload['complaint_code'] == 'MCC-2026-EXISTING'
    assert payload['category_name'] == 'Garbage / Waste'

    with app.app_context():
        updated = Complaint.query.filter_by(complaint_code='MCC-2026-EXISTING').first()
        assert updated.category.name == 'Garbage / Waste'

def test_same_location_merge_keeps_existing_worker(client, app, monkeypatch):
    with app.app_context():
        ward = Ward.query.filter_by(ward_number=61).first()
        department = Department.query.filter_by(name='Solid Waste Management').first()
        worker = User.query.filter_by(
            ward_id=ward.id,
            department_id=department.id,
            role='ward_worker',
        ).first()
        parent = Complaint(
            complaint_code='MCC-2026-MERGE-WORKER',
            category_id=Category.query.filter_by(name='Garbage / Waste').first().id,
            ai_predicted_category_id=Category.query.filter_by(name='Garbage / Waste').first().id,
            latitude=12.2785,
            longitude=76.6520,
            ward_id=ward.id,
            department_id=department.id,
            assigned_worker_id=worker.id,
            assigned_at=datetime.utcnow(),
            status='ASSIGNED',
            report_count=1,
        )
        db.session.add(parent)
        db.session.commit()
        parent_id = parent.id
        worker_id = worker.id

    monkeypatch.setattr(
        'app.services.classification_service.classification_service.classify_image',
        lambda image_path: {
            'category_name': 'Garbage_Waste',
            'confidence': 0.94,
            'low_confidence': False,
            'status': 'CLASSIFIED',
            'model_version': 'test',
        },
    )
    img = io.BytesIO()
    from PIL import Image
    Image.new('RGB', (100, 100), color='blue').save(img, format='JPEG')
    img.seek(0)

    res = client.post(
        '/api/complaints',
        data={
            'photo': (img, 'same_spot_worker.jpg'),
            'latitude': '12.27855',
            'longitude': '76.6520',
        },
        content_type='multipart/form-data',
    )

    assert res.status_code == 200
    assert res.get_json()['merged'] is True
    with app.app_context():
        merged = Complaint.query.get(parent_id)
        assert merged.assigned_worker_id == worker_id
        assert merged.report_count == 2

# ----------------- 9. Full Complaint Submission Flow -----------------
def test_file_complaint_api(client, app):
    # Dummy test image
    from PIL import Image
    img_byte_arr = io.BytesIO()
    Image.new('RGB', (100, 100), color='red').save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)

    data = {
        'photo': (img_byte_arr, 'test_issue.jpg'),
        'latitude': '12.2785',
        'longitude': '76.6520',
        'citizen_phone': '9845012345',
        'description': 'Test garbage on street corner'
    }

    res = client.post('/api/complaints', data=data, content_type='multipart/form-data')
    assert res.status_code == 201
    json_data = res.get_json()
    assert 'MCC-2026-' in json_data['complaint_code']
    assert json_data['category_name'] is not None
    assert json_data['priority'] in ('LOW', 'MEDIUM', 'HIGH')
    assert len(json_data['priority_reasons']) > 0
    assert json_data['assigned_worker_name']
    assert json_data['assigned_worker_phone']
    with app.app_context():
        created = Complaint.query.filter_by(complaint_code=json_data['complaint_code']).one()
        assigned = User.query.get(created.assigned_worker_id)
        assert assigned.email == worker_email_for(created.ward, 'waste')
        assert created.to_dict()['assigned_worker_phone'] == assigned.phone

    # 9. Micro-Proximity Auto-Merge Test (< 20m)
    img2 = io.BytesIO()
    Image.new('RGB', (100, 100), color='blue').save(img2, format='JPEG')
    img2.seek(0)
    data2 = {
        'photo': (img2, 'angle2.jpg'),
        'latitude': '12.27855', # ~6 meters away
        'longitude': '76.6520',
        'citizen_phone': '9845099999',
        'description': 'Same garbage pile different angle'
    }
    res2 = client.post('/api/complaints', data=data2, content_type='multipart/form-data')
    assert res2.status_code == 200
    json_data2 = res2.get_json()
    assert json_data2['merged'] is True
    assert json_data2['report_count'] == 2
    assert json_data2['complaint_code'] == json_data['complaint_code']

    # 10. Third Report Auto-Escalation to HIGH
    img3 = io.BytesIO()
    Image.new('RGB', (100, 100), color='green').save(img3, format='JPEG')
    img3.seek(0)
    data3 = {
        'photo': (img3, 'angle3.jpg'),
        'latitude': '12.27858', # ~9 meters away
        'longitude': '76.6520',
        'citizen_phone': '9845088888',
        'description': 'Third citizen reporting this exact issue'
    }
    res3 = client.post('/api/complaints', data=data3, content_type='multipart/form-data')
    assert res3.status_code == 200
    json_data3 = res3.get_json()
    assert json_data3['merged'] is True
    assert json_data3['report_count'] == 3
    assert json_data3['priority'] == 'HIGH'

    # 11. Strict Outside MCC Boundary Rejection Test
    img4 = io.BytesIO()
    Image.new('RGB', (100, 100), color='black').save(img4, format='JPEG')
    img4.seek(0)
    data_outside = {
        'photo': (img4, 'outside.jpg'),
        'latitude': '13.0827', # Chennai coordinates outside Mysuru
        'longitude': '80.2707',
        'citizen_phone': '9845011111'
    }
    res_out = client.post('/api/complaints', data=data_outside, content_type='multipart/form-data')
    assert res_out.status_code == 400
    assert 'outside_mcc_boundary' in res_out.get_json()
    assert res_out.get_json()['outside_mcc_boundary'] is True

def test_all_department_workers_for_a_ward_can_log_in(client, app):
    with app.app_context():
        ward = Ward.query.filter_by(ward_number=61).one()
        workers = User.query.filter_by(ward_id=ward.id, role='ward_worker').all()
        assert len(workers) == 4
        for worker in workers:
            response = client.post('/api/auth/login', json={
                'email': worker.email,
                'password': 'Worker@123',
            })
            assert response.status_code == 200

def test_startup_backfills_existing_complaint_assignment(app):
    with app.app_context():
        ward = Ward.query.filter_by(ward_number=61).one()
        department = Department.query.filter_by(name="Roads & Infrastructure").one()
        complaint = Complaint(
            complaint_code="MCC-2026-BACKFILL",
            latitude=12.30,
            longitude=76.65,
            ward_id=ward.id,
            department_id=department.id,
            status="SUBMITTED",
        )
        db.session.add(complaint)
        db.session.commit()

        ensure_ward_department_workers()
        ensure_ward_department_workers()
        db.session.refresh(complaint)

        worker = User.query.get(complaint.assigned_worker_id)
        assert worker.email == worker_email_for(ward, "road")
        assert complaint.assigned_at is not None
        assert complaint.status == "ASSIGNED"
        assignment_history = ComplaintStatusHistory.query.filter_by(
            complaint_id=complaint.id,
            new_status="ASSIGNED",
        ).all()
        assert len(assignment_history) == 1

def test_uploaded_photo_persists_across_filesystem_reload(client, app):
    from io import BytesIO
    from PIL import Image
    from app.models.stored_file import StoredFile
    from app.services.storage_service import storage_service

    img_byte_arr = BytesIO()
    Image.new('RGB', (64, 64), color='blue').save(img_byte_arr, format='JPEG')
    dummy_bytes = img_byte_arr.getvalue()
    img_byte_arr.seek(0)

    data = {
        'photo': (img_byte_arr, 'persistent_test_issue.jpg'),
        'latitude': '12.2785',
        'longitude': '76.6520',
        'citizen_phone': '9845012345',
        'description': 'Test persistent photo recovery'
    }

    res = client.post('/api/complaints', data=data, content_type='multipart/form-data')
    assert res.status_code == 201
    code = res.get_json()['complaint_code']

    track_res = client.get(f'/api/complaints/track?code={code}&phone=9845012345')
    assert track_res.status_code == 200
    images = track_res.get_json()['complaint']['images']
    assert len(images) > 0
    photo_rel_path = images[0]['image_path']

    # Verify StoredFile saved the bytes in DB
    stored = StoredFile.find_file(photo_rel_path)
    assert stored is not None
    assert stored.file_data == dummy_bytes

    # Now SIMULATE container reload/disk wipe by deleting the physical file from disk
    photo_abs_path = storage_service.get_absolute_path(photo_rel_path)
    if os.path.exists(photo_abs_path):
        os.remove(photo_abs_path)
    assert not os.path.exists(photo_abs_path)

    # Request the image via the static upload route
    img_resp = client.get(photo_rel_path)
    assert img_resp.status_code == 200
    assert img_resp.data == dummy_bytes

    # Verify the file was re-hydrated back to disk for local caching
    assert os.path.exists(photo_abs_path)

