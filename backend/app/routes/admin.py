from flask import Blueprint, request, jsonify
from datetime import datetime
from app.extensions import db
from app.models.complaint import Complaint, ComplaintImage
from app.models.evidence import ResolutionEvidence
from app.models.user import User
from app.models.department import Department, Category, CategoryDepartmentMap
from app.models.ward import Ward
from app.models.important_location import ImportantLocation
from app.models.analytics import Hotspot, RecurringIssue, SlaRule, AuditLog
from app.services.sla_service import sla_service
from app.services.notification_service import notification_service
from app.services.hotspot_service import hotspot_service
from app.services.health_score_service import health_score_service
from app.routes.auth import token_required, roles_required

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

# ----------------- Verification Queue (Section 17) -----------------
@admin_bp.route('/verification-queue', methods=['GET'])
@roles_required('admin')
def get_verification_queue():
    """
    Returns complaints in VERIFICATION_PENDING state with side-by-side evidence data.
    """
    pending = Complaint.query.filter_by(status='VERIFICATION_PENDING').order_by(Complaint.updated_at.asc()).all()
    queue = []
    for c in pending:
        ev = c.resolution_evidence
        orig_img = c.images.first()
        queue.append({
            'complaint_id': c.id,
            'complaint_code': c.complaint_code,
            'category_name': c.category.name if c.category else 'Civic Issue',
            'ward_name': c.ward.ward_name if c.ward else None,
            'ward_number': c.ward.ward_number if c.ward else None,
            'priority': c.priority,
            'description': c.description,
            'created_at': c.created_at.isoformat() if c.created_at else None,
            # Original details
            'original_photo': orig_img.image_path if orig_img else None,
            'original_latitude': c.latitude,
            'original_longitude': c.longitude,
            # Resolution details
            'resolution_photo': ev.photo_path if ev else None,
            'resolution_latitude': ev.latitude if ev else None,
            'resolution_longitude': ev.longitude if ev else None,
            'distance_from_original_m': round(ev.distance_from_original_m, 1) if ev else 0.0,
            'officer_name': ev.officer.name if ev and ev.officer else 'Field Officer',
            'officer_notes': ev.verification_notes if ev else '',
            'submitted_at': ev.submitted_at.isoformat() if ev and ev.submitted_at else None
        })
    return jsonify({'queue': queue}), 200

@admin_bp.route('/complaints/<int:complaint_id>/verify', methods=['POST'])
@roles_required('admin')
def verify_resolution(complaint_id):
    """
    Approve or Reject Field Officer resolution.
    """
    complaint = Complaint.query.get_or_404(complaint_id)
    evidence = ResolutionEvidence.query.filter_by(complaint_id=complaint.id).first()
    if not evidence:
        return jsonify({'error': 'No resolution evidence submitted for this complaint'}), 400

    data = request.get_json() or {}
    decision = data.get('decision', '').lower()
    notes = data.get('notes', '').strip()

    admin_user = request.current_user

    if decision == 'approve':
        evidence.verification_status = 'approved'
        evidence.verified_by_admin_id = admin_user.id
        evidence.verified_at = datetime.utcnow()
        evidence.verification_notes = notes

        sla_service.transition_status(
            complaint=complaint,
            new_status='RESOLVED',
            user_id=admin_user.id,
            remarks=f"Resolution approved by Admin {admin_user.name}. Notes: {notes}"
        )

        # Notify citizen
        notification_service.send(
            recipient_type='citizen',
            recipient_ref_id=None,
            message=f"Your complaint {complaint.complaint_code} has been successfully RESOLVED and verified by MCC. Thank you for your civic contribution!",
            complaint_id=complaint.id
        )

        # Log audit
        audit = AuditLog(
            user_id=admin_user.id,
            action='APPROVE_RESOLUTION',
            entity_type='complaint',
            entity_id=complaint.id,
            details={'decision': 'approve', 'notes': notes, 'distance_m': evidence.distance_from_original_m}
        )
        db.session.add(audit)
        db.session.commit()

        return jsonify({'message': 'Complaint marked as RESOLVED.', 'status': 'RESOLVED'}), 200

    elif decision == 'reject':
        evidence.verification_status = 'rejected'
        evidence.verified_by_admin_id = admin_user.id
        evidence.verified_at = datetime.utcnow()
        evidence.verification_notes = notes

        sla_service.transition_status(
            complaint=complaint,
            new_status='REOPENED',
            user_id=admin_user.id,
            remarks=f"Resolution rejected by Admin {admin_user.name}. Sent back to officer. Notes: {notes}"
        )

        # Notify department queue
        notification_service.send(
            recipient_type='department',
            recipient_ref_id=complaint.department_id,
            message=f"REOPENED: Complaint {complaint.complaint_code} resolution was rejected by Admin. Reason: {notes}",
            complaint_id=complaint.id
        )

        audit = AuditLog(
            user_id=admin_user.id,
            action='REJECT_RESOLUTION',
            entity_type='complaint',
            entity_id=complaint.id,
            details={'decision': 'reject', 'notes': notes}
        )
        db.session.add(audit)
        db.session.commit()

        return jsonify({'message': 'Resolution rejected. Complaint returned to REOPENED.', 'status': 'REOPENED'}), 200

    else:
        return jsonify({'error': "Invalid decision. Must be 'approve' or 'reject'"}), 400

# ----------------- Analytics Endpoints (Section 18 & 21) -----------------
@admin_bp.route('/analytics/overview', methods=['GET'])
@roles_required('admin')
def get_analytics_overview():
    total_complaints = Complaint.query.count()
    resolved_count = Complaint.query.filter_by(status='RESOLVED').count()
    in_progress = Complaint.query.filter_by(status='IN_PROGRESS').count()
    pending = Complaint.query.filter(Complaint.status.in_(['SUBMITTED', 'ASSIGNED', 'REOPENED', 'VERIFICATION_PENDING'])).count()
    overdue_count = Complaint.query.filter_by(status='OVERDUE').count()

    # Priority distribution
    priority_dist = {
        'HIGH': Complaint.query.filter_by(priority='HIGH').count(),
        'MEDIUM': Complaint.query.filter_by(priority='MEDIUM').count(),
        'LOW': Complaint.query.filter_by(priority='LOW').count()
    }

    # Category breakdown
    categories = Category.query.all()
    cat_breakdown = []
    for c in categories:
        count = Complaint.query.filter_by(category_id=c.id).count()
        cat_breakdown.append({'category': c.name, 'count': count})

    # Department performance
    depts = Department.query.all()
    dept_stats = []
    for d in depts:
        d_total = Complaint.query.filter_by(department_id=d.id).count()
        d_resolved = Complaint.query.filter_by(department_id=d.id, status='RESOLVED').count()
        d_overdue = Complaint.query.filter_by(department_id=d.id, status='OVERDUE').count()
        rate = round((d_resolved / d_total * 100), 1) if d_total > 0 else 100.0
        dept_stats.append({
            'department_id': d.id,
            'department_name': d.name,
            'total': d_total,
            'resolved': d_resolved,
            'overdue': d_overdue,
            'resolution_rate': rate
        })

    return jsonify({
        'total_complaints': total_complaints,
        'resolved_count': resolved_count,
        'in_progress_count': in_progress,
        'pending_count': pending,
        'overdue_count': overdue_count,
        'resolution_rate_pct': round((resolved_count / total_complaints * 100), 1) if total_complaints > 0 else 100.0,
        'priority_distribution': priority_dist,
        'category_breakdown': cat_breakdown,
        'department_performance': dept_stats
    }), 200

@admin_bp.route('/analytics/hotspots', methods=['GET'])
@roles_required('admin')
def get_hotspots():
    hotspots = Hotspot.query.filter_by(active=True).all()
    return jsonify({'hotspots': [h.to_dict() for h in hotspots]}), 200

@admin_bp.route('/analytics/recalculate-hotspots', methods=['POST'])
@roles_required('admin')
def recalculate_hotspots():
    count = hotspot_service.recalculate_hotspots()
    return jsonify({'message': f'DBSCAN clustering completed. {count} active hotspots detected.', 'count': count}), 200

@admin_bp.route('/analytics/recurring-issues', methods=['GET'])
@roles_required('admin')
def get_recurring_issues():
    issues = RecurringIssue.query.order_by(RecurringIssue.detected_at.desc()).all()
    return jsonify({'recurring_issues': [i.to_dict() for i in issues]}), 200

@admin_bp.route('/analytics/ward-health-scores', methods=['GET'])
@roles_required('admin')
def get_ward_health_scores():
    scores = health_score_service.compute_all_wards()
    return jsonify({'scores': scores}), 200

@admin_bp.route('/analytics/sla-overdue', methods=['GET'])
@roles_required('admin')
def get_sla_overdue():
    # Trigger check first
    sla_service.check_and_escalate_overdue()
    overdue = Complaint.query.filter_by(status='OVERDUE').all()
    return jsonify({'overdue_complaints': [c.to_dict(include_sensitive=True) for c in overdue]}), 200

# ----------------- CRUD Resources (Section 18) -----------------
@admin_bp.route('/users', methods=['GET', 'POST'])
@roles_required('admin')
def manage_users():
    if request.method == 'GET':
        users = User.query.all()
        return jsonify({'users': [u.to_dict() for u in users]}), 200
    
    data = request.get_json() or {}
    name = data.get('name')
    email = data.get('email', '').strip().lower()
    password = data.get('password')
    role = data.get('role', 'field_officer')
    dept_id = data.get('department_id')
    ward_id = data.get('ward_id')

    if not name or not email or not password:
        return jsonify({'error': 'Name, email, and password required'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 400

    user = User(
        name=name,
        email=email,
        phone=data.get('phone'),
        role=role,
        department_id=dept_id,
        ward_id=ward_id
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'User created', 'user': user.to_dict()}), 201

@admin_bp.route('/departments', methods=['GET', 'POST'])
@roles_required('admin')
def manage_departments():
    if request.method == 'GET':
        depts = Department.query.all()
        return jsonify({'departments': [d.to_dict() for d in depts]}), 200

    data = request.get_json() or {}
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Department name is required'}), 400
    
    d = Department(name=name, description=data.get('description', ''))
    db.session.add(d)
    db.session.commit()
    return jsonify({'message': 'Department created', 'department': d.to_dict()}), 201

@admin_bp.route('/wards', methods=['GET'])
@roles_required('admin')
def get_wards():
    wards = Ward.query.order_by(Ward.ward_number.asc()).all()
    return jsonify({'wards': [w.to_dict() for w in wards]}), 200

@admin_bp.route('/wards/<int:ward_id>/assign-corporator', methods=['PATCH'])
@roles_required('admin')
def assign_corporator(ward_id):
    ward = Ward.query.get_or_404(ward_id)
    data = request.get_json() or {}
    corp_user_id = data.get('corporator_user_id')
    ward.corporator_user_id = corp_user_id
    db.session.commit()
    return jsonify({'message': f'Corporator assigned to {ward.ward_name}', 'ward': ward.to_dict()}), 200

@admin_bp.route('/important-locations', methods=['GET', 'POST'])
@roles_required('admin')
def manage_locations():
    if request.method == 'GET':
        locs = ImportantLocation.query.all()
        return jsonify({'locations': [l.to_dict() for l in locs]}), 200

    data = request.get_json() or {}
    name = data.get('name')
    l_type = data.get('type')
    lat = data.get('latitude')
    lng = data.get('longitude')

    if not name or not l_type or lat is None or lng is None:
        return jsonify({'error': 'name, type, latitude, and longitude are required'}), 400

    loc = ImportantLocation(name=name, type=l_type, latitude=float(lat), longitude=float(lng))
    db.session.add(loc)
    db.session.commit()
    return jsonify({'message': 'Location created', 'location': loc.to_dict()}), 201
