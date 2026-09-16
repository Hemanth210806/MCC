from flask import Blueprint, jsonify, request
from app.models.complaint import Complaint
from app.models.ward import Ward
from app.models.notification import Notification
from app.services.health_score_service import health_score_service
from app.routes.auth import token_required, roles_required

corporator_bp = Blueprint('corporator', __name__, url_prefix='/api/corporator')

@corporator_bp.route('/complaints', methods=['GET'])
@roles_required('corporator', 'admin')
def get_ward_complaints():
    user = request.current_user
    ward_id = request.args.get('ward_id', type=int) or user.ward_id

    if not ward_id:
        # If user is admin without explicit ward, or unassigned corporator
        ward = Ward.query.first()
        ward_id = ward.id if ward else None

    status = request.args.get('status')
    priority = request.args.get('priority')

    query = Complaint.query.filter_by(ward_id=ward_id)
    if status:
        query = query.filter_by(status=status)
    if priority:
        query = query.filter_by(priority=priority)

    complaints = query.order_by(Complaint.created_at.desc()).all()
    return jsonify({
        'ward_id': ward_id,
        'complaints': [c.to_dict(include_sensitive=True) for c in complaints]
    }), 200

@corporator_bp.route('/ward-analytics', methods=['GET'])
@roles_required('corporator', 'admin')
def get_ward_analytics():
    user = request.current_user
    ward_id = request.args.get('ward_id', type=int) or user.ward_id

    if not ward_id:
        ward = Ward.query.first()
        ward_id = ward.id if ward else None

    if not ward_id:
        return jsonify({'error': 'No ward assigned'}), 404

    score_data = health_score_service.compute_ward_score(ward_id)

    # Category breakdown
    complaints = Complaint.query.filter_by(ward_id=ward_id).all()
    cat_counts = {}
    for c in complaints:
        name = c.category.name if c.category else 'Other'
        cat_counts[name] = cat_counts.get(name, 0) + 1

    return jsonify({
        'ward_id': ward_id,
        'health_score': score_data['health_score'],
        'rating': score_data['rating'],
        'factors': score_data['factors'],
        'category_breakdown': cat_counts
    }), 200

@corporator_bp.route('/notifications', methods=['GET'])
@roles_required('corporator', 'admin')
def get_notifications():
    user = request.current_user
    notifs = Notification.query.filter(
        (Notification.recipient_type == 'corporator') &
        ((Notification.recipient_ref_id == user.id) | (Notification.recipient_ref_id == None))
    ).order_by(Notification.created_at.desc()).limit(50).all()

    return jsonify({'notifications': [n.to_dict() for n in notifs]}), 200
