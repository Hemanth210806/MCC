from flask import Blueprint, request, jsonify
from datetime import datetime
from app.extensions import db
from app.models.complaint import Complaint
from app.models.evidence import ResolutionEvidence
from app.services.sla_service import sla_service
from app.services.storage_service import storage_service
from app.utils.geo import haversine_distance_meters
from app.routes.auth import token_required, roles_required

officer_bp = Blueprint('officer', __name__, url_prefix='/api/officer')

@officer_bp.route('/complaints', methods=['GET'])
@roles_required('field_officer', 'admin')
def get_department_complaints():
    user = request.current_user
    status = request.args.get('status')
    priority = request.args.get('priority')

    query = Complaint.query
    if user.role == 'field_officer' and user.department_id:
        query = query.filter_by(department_id=user.department_id)

    if status:
        query = query.filter_by(status=status)
    if priority:
        query = query.filter_by(priority=priority)

    # Sort order: OVERDUE and HIGH first, then earliest sla_due_at
    complaints = query.order_by(
        Complaint.status == 'OVERDUE',
        Complaint.priority == 'HIGH',
        Complaint.sla_due_at.asc()
    ).all()

    return jsonify({'complaints': [c.to_dict(include_sensitive=True) for c in complaints]}), 200

@officer_bp.route('/complaints/<int:complaint_id>/start', methods=['PATCH'])
@roles_required('field_officer', 'admin')
def start_work(complaint_id):
    complaint = Complaint.query.get_or_404(complaint_id)
    user = request.current_user

    try:
        sla_service.transition_status(
            complaint=complaint,
            new_status='IN_PROGRESS',
            user_id=user.id,
            remarks=f"Work started by Field Officer {user.name}"
        )
        return jsonify({'message': 'Work started', 'complaint': complaint.to_dict(include_sensitive=True)}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@officer_bp.route('/complaints/<int:complaint_id>/resolve', methods=['POST'])
@roles_required('field_officer', 'admin')
def submit_resolution(complaint_id):
    complaint = Complaint.query.get_or_404(complaint_id)
    user = request.current_user

    photo_file = request.files.get('resolution_photo')
    if not photo_file:
        return jsonify({'error': 'Resolution evidence photograph is required'}), 400

    try:
        lat = float(request.form.get('latitude'))
        lng = float(request.form.get('longitude'))
    except (TypeError, ValueError):
        return jsonify({'error': 'Current resolution GPS latitude and longitude are required'}), 400

    gps_acc = request.form.get('gps_accuracy_m')
    try:
        gps_accuracy_m = float(gps_acc) if gps_acc else None
    except ValueError:
        gps_accuracy_m = None

    notes = request.form.get('notes', '')

    # 1. Save resolution photo
    try:
        rel_path = storage_service.save_file(photo_file, subfolder='resolutions')
    except Exception as e:
        return jsonify({'error': f'Failed to store resolution photo: {str(e)}'}), 400

    # 2. Compute Haversine distance between original complaint and resolution GPS
    distance_m = haversine_distance_meters(complaint.latitude, complaint.longitude, lat, lng)

    # 3. Create or update ResolutionEvidence
    existing_evidence = ResolutionEvidence.query.filter_by(complaint_id=complaint.id).first()
    if existing_evidence:
        existing_evidence.photo_path = rel_path
        existing_evidence.latitude = lat
        existing_evidence.longitude = lng
        existing_evidence.gps_accuracy_m = gps_accuracy_m
        existing_evidence.distance_from_original_m = distance_m
        existing_evidence.submitted_at = datetime.utcnow()
        existing_evidence.verification_status = 'pending'
        existing_evidence.verification_notes = notes
        evidence = existing_evidence
    else:
        evidence = ResolutionEvidence(
            complaint_id=complaint.id,
            officer_id=user.id,
            photo_path=rel_path,
            latitude=lat,
            longitude=lng,
            gps_accuracy_m=gps_accuracy_m,
            distance_from_original_m=distance_m,
            verification_status='pending',
            verification_notes=notes
        )
        db.session.add(evidence)

    # 4. Transition status -> VERIFICATION_PENDING
    try:
        sla_service.transition_status(
            complaint=complaint,
            new_status='VERIFICATION_PENDING',
            user_id=user.id,
            remarks=f"Resolution proof submitted by Officer {user.name}. Distance from original: {distance_m:.1f}m."
        )
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    db.session.commit()

    return jsonify({
        'message': 'Resolution evidence submitted. Pending Admin verification.',
        'distance_from_original_m': round(distance_m, 1),
        'complaint': complaint.to_dict(include_sensitive=True),
        'evidence': evidence.to_dict()
    }), 200
