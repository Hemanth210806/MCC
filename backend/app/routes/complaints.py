import os
from flask import Blueprint, request, jsonify, current_app
from app.extensions import db
from app.models.complaint import Complaint, ComplaintImage, ComplaintStatusHistory, Feedback
from app.models.department import Category, Department
from app.models.ward import Ward
from app.utils.id_generator import generate_complaint_code
from app.utils.geo import haversine_distance_meters
from app.services.ward_lookup import ward_lookup_service
from app.services.classification_service import classification_service
from app.services.routing_service import routing_service
from app.services.priority_engine import priority_engine
from app.services.notification_service import notification_service
from app.services.recurring_service import recurring_service
from app.services.sla_service import sla_service
from app.services.storage_service import storage_service
from app.routes.auth import token_required

complaints_bp = Blueprint('complaints', __name__, url_prefix='/api/complaints')

@complaints_bp.route('', methods=['POST'])
def file_complaint():
    """
    Citizen complaint submission endpoint (multipart/form-data):
    - photo (file)
    - latitude (float)
    - longitude (float)
    - gps_accuracy_m (float, optional)
    - citizen_name (optional)
    - citizen_phone (optional)
    - citizen_email (optional)
    - description (optional)
    """
    photo_file = request.files.get('photo')
    if not photo_file:
        return jsonify({'error': 'A photograph of the civic issue is required'}), 400

    try:
        latitude = float(request.form.get('latitude'))
        longitude = float(request.form.get('longitude'))
    except (TypeError, ValueError):
        return jsonify({'error': 'Valid latitude and longitude coordinates are required'}), 400

    gps_accuracy = request.form.get('gps_accuracy_m')
    try:
        gps_accuracy_m = float(gps_accuracy) if gps_accuracy else None
    except ValueError:
        gps_accuracy_m = None

    citizen_name = request.form.get('citizen_name', '').strip() or None
    citizen_phone = request.form.get('citizen_phone', '').strip() or None
    citizen_email = request.form.get('citizen_email', '').strip() or None
    description = request.form.get('description', '').strip() or None

    # 1. Save photo
    try:
        photo_rel_path = storage_service.save_file(photo_file, subfolder='complaints')
        photo_abs_path = storage_service.get_absolute_path(photo_rel_path)
    except Exception as e:
        return jsonify({'error': f'Failed to process uploaded image: {str(e)}'}), 400

    # 2. AI Image Classification
    ai_result = classification_service.classify_image(photo_abs_path)
    predicted_cat_name = ai_result.get('category_name')

    matched_cat = None
    if predicted_cat_name:
        matched_cat = Category.query.filter(Category.name.ilike(f"%{predicted_cat_name.split('/')[0].strip()}%")).first()

    if not matched_cat:
        # Fallback to general category or first category
        matched_cat = Category.query.first()

    # 3. GIS Ward point-in-polygon lookup
    ward_res = ward_lookup_service.lookup(latitude, longitude)
    assigned_ward = None
    outside_boundary = ward_res.get('outside_mcc_boundary', False)

    if not outside_boundary and ward_res.get('ward_number'):
        assigned_ward = Ward.query.filter_by(ward_number=ward_res['ward_number']).first()

    # 4. Automatic Department Routing
    assigned_dept = routing_service.get_department_for_category(matched_cat.id)

    # 5. Nearby similar complaints count (within 300m)
    similar_count = 0
    recent_complaints = Complaint.query.filter_by(category_id=matched_cat.id).all()
    for rc in recent_complaints:
        if haversine_distance_meters(latitude, longitude, rc.latitude, rc.longitude) <= 300:
            similar_count += 1

    # 6. Priority Engine calculation
    priority_res = priority_engine.compute_priority(
        category_name=matched_cat.name,
        latitude=latitude,
        longitude=longitude,
        similar_nearby_count=similar_count
    )

    priority_level = priority_res['priority']
    priority_score = priority_res['score']
    priority_reasons = priority_res['reasons']

    # 7. SLA Target Calculation
    sla_due = sla_service.calculate_due_date(priority_level)

    # 8. Generate Complaint Code MCC-YYYY-NNNNN
    complaint_code = generate_complaint_code()

    # 9. Create Complaint Record
    complaint = Complaint(
        complaint_code=complaint_code,
        citizen_name=citizen_name,
        citizen_phone=citizen_phone,
        citizen_email=citizen_email,
        description=description,
        category_id=matched_cat.id,
        ai_predicted_category_id=matched_cat.id,
        ai_confidence=ai_result.get('confidence'),
        ai_low_confidence=ai_result.get('low_confidence', False),
        ai_classification_status=ai_result.get('status', 'CLASSIFIED'),
        ai_model_version=ai_result.get('model_version'),
        latitude=latitude,
        longitude=longitude,
        gps_accuracy_m=gps_accuracy_m,
        ward_id=assigned_ward.id if assigned_ward else None,
        department_id=assigned_dept.id if assigned_dept else None,
        priority=priority_level,
        priority_score=priority_score,
        priority_reasons=priority_reasons,
        status='SUBMITTED',
        sla_due_at=sla_due,
        is_demo_data=False
    )
    db.session.add(complaint)
    db.session.flush()

    # Add Complaint Image
    c_img = ComplaintImage(
        complaint_id=complaint.id,
        image_path=photo_rel_path,
        image_type='ORIGINAL'
    )
    db.session.add(c_img)

    # Add Status History: SUBMITTED
    hist_sub = ComplaintStatusHistory(
        complaint_id=complaint.id,
        old_status=None,
        new_status='SUBMITTED',
        remarks="Complaint registered by citizen with geolocation and photo."
    )
    db.session.add(hist_sub)

    # Auto transition to ASSIGNED
    complaint.status = 'ASSIGNED'
    hist_assign = ComplaintStatusHistory(
        complaint_id=complaint.id,
        old_status='SUBMITTED',
        new_status='ASSIGNED',
        remarks=f"Auto-routed to {assigned_dept.name if assigned_dept else 'MCC'}"
    )
    db.session.add(hist_assign)
    db.session.commit()

    # Check recurring issue
    recurring_res = recurring_service.check_and_record_recurring(complaint)

    # 10. Dispatches Notifications
    if assigned_ward and assigned_ward.corporator_user_id:
        notification_service.send(
            recipient_type='corporator',
            recipient_ref_id=assigned_ward.corporator_user_id,
            message=f"New {complaint.priority} priority complaint {complaint.complaint_code} filed in your ward ({assigned_ward.ward_name}).",
            complaint_id=complaint.id
        )

    if assigned_dept:
        notification_service.send(
            recipient_type='department',
            recipient_ref_id=assigned_dept.id,
            message=f"New complaint {complaint.complaint_code} assigned to {assigned_dept.name} queue.",
            complaint_id=complaint.id
        )

    return jsonify({
        'message': 'Complaint successfully filed',
        'complaint_code': complaint.complaint_code,
        'ward_name': assigned_ward.ward_name if assigned_ward else 'Outside MCC Boundary (Flagged for Review)',
        'outside_mcc_boundary': outside_boundary,
        'category_name': matched_cat.name,
        'ai_confidence': round(ai_result.get('confidence', 0), 2),
        'ai_status': ai_result.get('status'),
        'department_name': assigned_dept.name if assigned_dept else None,
        'priority': priority_level,
        'priority_reasons': priority_reasons,
        'sla_due_at': sla_due.isoformat(),
        'tracking_url': f"/track?code={complaint.complaint_code}&phone={citizen_phone or ''}"
    }), 201

@complaints_bp.route('/track', methods=['GET'])
def track_complaint():
    """
    Citizen tracking endpoint: requires complaint_code + phone number match for security and privacy.
    """
    code = request.args.get('code', '').strip()
    phone = request.args.get('phone', '').strip()

    if not code:
        return jsonify({'error': 'Complaint ID is required'}), 400

    complaint = Complaint.query.filter_by(complaint_code=code).first()
    if not complaint:
        return jsonify({'error': 'No complaint found matching this Complaint ID'}), 404

    # If phone was originally provided, verify match
    if complaint.citizen_phone and phone:
        # Compare last 10 digits
        clean_input = ''.join(filter(str.isdigit, phone))[-10:]
        clean_stored = ''.join(filter(str.isdigit, complaint.citizen_phone))[-10:]
        if clean_input != clean_stored:
            return jsonify({'error': 'Phone number does not match registered complaint record'}), 403
    elif complaint.citizen_phone and not phone:
        return jsonify({'error': 'Mobile number verification required to view complaint details'}), 401

    history = [h.to_dict() for h in complaint.status_history]

    data = complaint.to_dict(include_sensitive=True)
    data['timeline'] = history

    return jsonify({'complaint': data}), 200

@complaints_bp.route('/<int:complaint_id>/status-history', methods=['GET'])
@token_required
def get_status_history(complaint_id):
    complaint = Complaint.query.get_or_404(complaint_id)
    history = [h.to_dict() for h in complaint.status_history]
    return jsonify({'history': history}), 200

@complaints_bp.route('/<int:complaint_id>/feedback', methods=['POST'])
def submit_feedback(complaint_id):
    """
    Submit rating (1-5) and feedback comment once resolved.
    """
    complaint = Complaint.query.get_or_404(complaint_id)
    if complaint.status != 'RESOLVED':
        return jsonify({'error': 'Feedback can only be submitted for RESOLVED complaints'}), 400

    existing = Feedback.query.filter_by(complaint_id=complaint.id).first()
    if existing:
        return jsonify({'error': 'Feedback has already been submitted for this complaint'}), 400

    data = request.get_json() or {}
    rating = data.get('rating')
    comment = data.get('comment', '').strip()

    if not rating or not (1 <= int(rating) <= 5):
        return jsonify({'error': 'Rating must be an integer between 1 and 5'}), 400

    fb = Feedback(
        complaint_id=complaint.id,
        rating=int(rating),
        comment=comment
    )
    db.session.add(fb)
    db.session.commit()

    return jsonify({'message': 'Thank you! Your feedback has been recorded.', 'feedback': fb.to_dict()}), 201
