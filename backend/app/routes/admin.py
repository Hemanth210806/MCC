from flask import Blueprint, request, jsonify
from datetime import datetime
from sqlalchemy import func
from app.extensions import db
from app.models.complaint import Complaint, ComplaintStatusHistory, _format_utc, ComplaintImage
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

@admin_bp.route('/workers', methods=['GET'])
@roles_required('admin')
def list_workers():
    workers = User.query.filter(User.role.in_(['ward_worker', 'field_officer'])).order_by(User.name.asc()).all()

    # Aggregate status counts for all workers in a single fast query
    status_counts = db.session.query(
        Complaint.assigned_worker_id,
        Complaint.status,
        func.count(Complaint.id)
    ).filter(Complaint.assigned_worker_id.isnot(None)).group_by(
        Complaint.assigned_worker_id, Complaint.status
    ).all()

    stats_map = {}
    for worker_id, status, count in status_counts:
        if worker_id not in stats_map:
            stats_map[worker_id] = {'total': 0, 'resolved': 0, 'overdue': 0, 'remaining': 0}
        stats_map[worker_id]['total'] += count
        if status == 'RESOLVED':
            stats_map[worker_id]['resolved'] += count
        else:
            stats_map[worker_id]['remaining'] += count
            if status == 'OVERDUE':
                stats_map[worker_id]['overdue'] += count

    # Calculate average resolution time for resolved complaints per worker
    resolved_complaints = Complaint.query.filter_by(status='RESOLVED').all()
    durations_map = {}
    for c in resolved_complaints:
        if not c.assigned_worker_id:
            continue
        start_time = c.assigned_at or c.created_at
        end_time = c.updated_at
        if c.resolution_evidence and c.resolution_evidence.verified_at:
            end_time = c.resolution_evidence.verified_at
        elif c.resolution_evidence and c.resolution_evidence.submitted_at:
            end_time = c.resolution_evidence.submitted_at
        if start_time and end_time and end_time > start_time:
            hours = (end_time - start_time).total_seconds() / 3600.0
            durations_map.setdefault(c.assigned_worker_id, []).append(hours)

    result = []
    for u in workers:
        u_dict = u.to_dict()
        st = stats_map.get(u.id, {'total': 0, 'resolved': 0, 'overdue': 0, 'remaining': 0})
        worker_durations = durations_map.get(u.id, [])
        avg_hours = round(sum(worker_durations) / len(worker_durations), 1) if worker_durations else 0.0
        avg_days = round(avg_hours / 24.0, 1)

        u_dict['stats'] = {
            'total_assigned': st['total'],
            'resolved_count': st['resolved'],
            'remaining_count': st['remaining'],
            'overdue_count': st['overdue'],
            'avg_resolution_days': avg_days,
            'avg_resolution_hours': avg_hours,
            'resolution_rate': round((st['resolved'] / st['total'] * 100), 1) if st['total'] > 0 else 0.0
        }
        result.append(u_dict)

    return jsonify({'workers': result}), 200

@admin_bp.route('/workers/<int:worker_id>/performance', methods=['GET'])
@roles_required('admin')
def get_worker_performance(worker_id):
    worker = User.query.get_or_404(worker_id)
    complaints = Complaint.query.filter_by(assigned_worker_id=worker.id).order_by(Complaint.updated_at.desc()).all()

    total = len(complaints)
    resolved = [c for c in complaints if c.status == 'RESOLVED']
    remaining = [c for c in complaints if c.status in ('ASSIGNED', 'IN_PROGRESS', 'VERIFICATION_PENDING', 'OVERDUE', 'REOPENED')]
    overdue = [c for c in complaints if c.status == 'OVERDUE']

    # Calculate resolution durations
    durations_hours = []
    for c in resolved:
        start_time = c.assigned_at or c.created_at
        end_time = c.updated_at
        if c.resolution_evidence and c.resolution_evidence.verified_at:
            end_time = c.resolution_evidence.verified_at
        elif c.resolution_evidence and c.resolution_evidence.submitted_at:
            end_time = c.resolution_evidence.submitted_at
        if start_time and end_time and end_time > start_time:
            hours = (end_time - start_time).total_seconds() / 3600.0
            durations_hours.append(hours)

    avg_hours = round(sum(durations_hours) / len(durations_hours), 1) if durations_hours else 0.0
    avg_days = round(avg_hours / 24.0, 1)

    formatted_complaints = []
    for c in complaints:
        orig_img = c.images.first()
        res_photo = c.resolution_evidence.photo_path if c.resolution_evidence else None

        time_taken_str = None
        if c.status == 'RESOLVED':
            start_time = c.assigned_at or c.created_at
            end_time = (c.resolution_evidence.verified_at if c.resolution_evidence else None) or c.updated_at
            if start_time and end_time:
                diff_h = (end_time - start_time).total_seconds() / 3600.0
                if diff_h >= 24:
                    time_taken_str = f"Solved in {round(diff_h / 24.0, 1)} days"
                else:
                    time_taken_str = f"Solved in {round(diff_h, 1)} hours"
        elif c.status == 'OVERDUE' and c.sla_due_at:
            now = datetime.utcnow()
            diff_h = (now - c.sla_due_at).total_seconds() / 3600.0
            time_taken_str = f"Overdue by {round(diff_h / 24.0, 1)} days"
        elif c.sla_due_at:
            now = datetime.utcnow()
            diff_h = (c.sla_due_at - now).total_seconds() / 3600.0
            if diff_h > 0:
                time_taken_str = f"{round(diff_h / 24.0, 1)} days remaining" if diff_h >= 24 else f"{int(diff_h)}h remaining"
            else:
                time_taken_str = "SLA Deadline Exceeded"

        formatted_complaints.append({
            'id': c.id,
            'complaint_code': c.complaint_code,
            'category_name': c.category.name if c.category else 'Civic Issue',
            'ward_name': c.ward.ward_name if c.ward else None,
            'ward_number': c.ward.ward_number if c.ward else None,
            'department_name': c.department.name if c.department else None,
            'status': c.status,
            'priority': c.priority,
            'description': c.description,
            'created_at': _format_utc(c.created_at),
            'assigned_at': _format_utc(c.assigned_at),
            'sla_due_at': _format_utc(c.sla_due_at),
            'original_photo': orig_img.image_path if orig_img else None,
            'resolution_photo': res_photo,
            'time_taken_str': time_taken_str,
            'progress_percent': c.progress_percent or 0,
            'distance_from_original_m': round(c.resolution_evidence.distance_from_original_m, 1) if c.resolution_evidence else None
        })

    return jsonify({
        'worker': worker.to_dict(),
        'stats': {
            'total_assigned': total,
            'resolved_count': len(resolved),
            'remaining_count': len(remaining),
            'overdue_count': len(overdue),
            'avg_resolution_days': avg_days,
            'avg_resolution_hours': avg_hours,
            'resolution_rate_percent': round((len(resolved) / total * 100), 1) if total > 0 else 0.0
        },
        'complaints': formatted_complaints
    }), 200

@admin_bp.route('/complaints/<int:complaint_id>/send-reminder', methods=['POST'])
@roles_required('admin')
def send_overdue_reminder(complaint_id):
    complaint = Complaint.query.get_or_404(complaint_id)
    if not complaint.assigned_worker_id:
        return jsonify({'error': 'This complaint is not assigned to any worker'}), 400

    data = request.get_json() or {}
    custom_note = data.get('note', 'Urgent action required: This complaint has exceeded its SLA deadline.')

    notification_service.send(
        recipient_type='user',
        recipient_ref_id=complaint.assigned_worker_id,
        message=f"[ADMIN ESCALATION] Complaint {complaint.complaint_code} ({complaint.category.name if complaint.category else 'Civic Issue'}) is OVERDUE. {custom_note}",
        complaint_id=complaint.id
    )

    db.session.add(ComplaintStatusHistory(
        complaint_id=complaint.id,
        old_status=complaint.status,
        new_status=complaint.status,
        changed_by_user_id=request.current_user.id,
        remarks=f"Admin {request.current_user.name} issued an urgent overdue escalation notice to {complaint.assigned_worker.name if complaint.assigned_worker else 'worker'}. Note: {custom_note}"
    ))
    db.session.commit()
    return jsonify({
        'message': f"Urgent escalation notice successfully sent to {complaint.assigned_worker.name if complaint.assigned_worker else 'worker'}.",
        'complaint': complaint.to_dict(include_sensitive=True)
    }), 200

@admin_bp.route('/complaints/<int:complaint_id>/assign-worker', methods=['PATCH'])
@roles_required('admin')
def assign_worker(complaint_id):
    complaint = Complaint.query.get_or_404(complaint_id)
    data = request.get_json() or {}
    worker_id = data.get('worker_id', data.get('assigned_worker_id'))
    worker = User.query.filter(User.id == worker_id, User.role.in_(['ward_worker', 'field_officer'])).first()
    if not worker:
        return jsonify({'error': 'A valid ward worker or field officer is required'}), 400
    if worker.department_id and complaint.department_id and worker.department_id != complaint.department_id:
        return jsonify({'error': 'Worker must belong to the complaint department'}), 400
    old_status = complaint.status
    complaint.assigned_worker_id = worker.id
    complaint.assigned_at = datetime.utcnow()
    complaint.assigned_by_user_id = request.current_user.id
    if complaint.status in ('SUBMITTED', 'REOPENED'):
        complaint.status = 'ASSIGNED'
    db.session.add(ComplaintStatusHistory(
        complaint_id=complaint.id, old_status=old_status, new_status=complaint.status,
        changed_by_user_id=request.current_user.id,
        remarks=f'Assigned to {worker.name} by Admin {request.current_user.name}.'
    ))
    notification_service.send(
        recipient_type='user', recipient_ref_id=worker.id,
        message=f'Complaint {complaint.complaint_code} has been assigned to you.',
        complaint_id=complaint.id
    )
    db.session.commit()
    return jsonify({'message': 'Worker assigned', 'complaint': complaint.to_dict(include_sensitive=True)}), 200

@admin_bp.route('/assignment-monitoring', methods=['GET'])
@roles_required('admin')
def assignment_monitoring():
    complaints = Complaint.query.filter(
        Complaint.status.in_(['ASSIGNED', 'IN_PROGRESS', 'OVERDUE', 'REOPENED'])
    ).order_by(Complaint.updated_at.desc()).all()
    return jsonify({'complaints': [c.to_dict(include_sensitive=True) for c in complaints]}), 200

@admin_bp.route('/complaints', methods=['GET'])
@roles_required('admin')
def get_all_complaints_admin():
    """
    Returns all complaints with photos, assigned worker details, resolution proof,
    and computed duration for the Admin Overview explorer.
    """
    status_filter = request.args.get('status', 'ALL').strip().upper()
    sla_service.check_and_escalate_overdue()

    q = Complaint.query
    if status_filter == 'RESOLVED':
        q = q.filter(Complaint.status == 'RESOLVED')
    elif status_filter == 'OVERDUE':
        q = q.filter(Complaint.status == 'OVERDUE')
    elif status_filter == 'IN_PROGRESS':
        q = q.filter(Complaint.status.in_(['IN_PROGRESS', 'ASSIGNED', 'VERIFICATION_PENDING', 'REOPENED']))
    elif status_filter != 'ALL':
        q = q.filter(Complaint.status == status_filter)

    complaints = q.order_by(Complaint.created_at.desc()).all()
    results = []
    now = datetime.utcnow()

    for c in complaints:
        data = c.to_dict(include_sensitive=True)
        orig_img = c.images.first()
        ev = c.resolution_evidence

        time_taken_str = None
        if c.status == 'RESOLVED':
            start_time = c.assigned_at or c.created_at
            end_time = (ev.verified_at if ev else None) or c.updated_at
            if start_time and end_time:
                diff_h = (end_time - start_time).total_seconds() / 3600.0
                time_taken_str = f"Solved in {round(diff_h / 24.0, 1)} days" if diff_h >= 24 else f"Solved in {round(diff_h, 1)} hours"
        elif c.status == 'OVERDUE' and c.sla_due_at:
            diff_h = (now - c.sla_due_at).total_seconds() / 3600.0
            time_taken_str = f"Overdue by {round(diff_h / 24.0, 1)} days"
        elif c.sla_due_at:
            diff_h = (c.sla_due_at - now).total_seconds() / 3600.0
            if diff_h > 0:
                time_taken_str = f"{round(diff_h / 24.0, 1)} days remaining" if diff_h >= 24 else f"{int(diff_h)}h remaining"
            else:
                time_taken_str = "SLA Breached"

        data['time_taken_str'] = time_taken_str
        data['original_photo'] = orig_img.image_path if orig_img else None
        data['resolution_photo'] = ev.photo_path if ev else None
        data['resolution_notes'] = ev.verification_notes if ev else None
        data['distance_from_original_m'] = round(ev.distance_from_original_m, 1) if ev else None
        results.append(data)

    return jsonify({'complaints': results, 'total': len(results)}), 200

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
            'created_at': _format_utc(c.created_at),
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
            'submitted_at': _format_utc(ev.submitted_at) if ev else None
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
