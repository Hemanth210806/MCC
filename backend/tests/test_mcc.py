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
from app.services.ward_lookup import ward_lookup_service
from app.services.priority_engine import priority_engine
from app.services.routing_service import routing_service
from app.services.sla_service import sla_service
from app.services.recurring_service import recurring_service
from app.services.hotspot_service import hotspot_service
from app.routes.auth import generate_jwt

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
        db.session.add_all([dept1, dept2])
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

        # Seed Ward for GIS lookup testing
        ward62 = Ward(ward_number=62, ward_name="Vishweshwara Nagara", geometry={"type": "Polygon", "coordinates": []})
        db.session.add(ward62)

        # Users
        admin = User(name="Test Admin", email="admin.test@mcc.gov.in", role="admin")
        admin.set_password("Pass@123")
        officer = User(name="Test Officer", email="officer.test@mcc.gov.in", role="field_officer", department_id=dept1.id)
        officer.set_password("Pass@123")
        db.session.add_all([admin, officer])
        db.session.commit()

        yield app

        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

# ----------------- 1. Ward Point-in-Polygon Tests -----------------
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

# ----------------- 8. Full Complaint Submission Flow -----------------
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
