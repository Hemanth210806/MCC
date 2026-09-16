from flask import Blueprint, jsonify, request
from app.models.ward import Ward
from app.models.complaint import Complaint
from app.models.analytics import Hotspot
from app.services.health_score_service import health_score_service
from app.services.ward_lookup import ward_lookup_service

public_map_bp = Blueprint('public_map', __name__, url_prefix='/api/public')

@public_map_bp.route('/map-data', methods=['GET'])
def get_map_data():
    """
    Returns verified GeoJSON ward boundaries with aggregated counts and health scores,
    active hotspots, and generalized complaint markers (no PII).
    """
    geojson = ward_lookup_service.get_all_wards_geojson()

    # Pre-calculate counts and health scores per ward
    all_scores = {s['ward_id']: s for s in health_score_service.compute_all_wards()}

    for feat in geojson.get('features', []):
        props = feat.get('properties', {})
        wid = props.get('ward_id') or props.get('ward_number')
        score_info = all_scores.get(wid, {})
        props['health_score'] = score_info.get('health_score', 100)
        props['rating'] = score_info.get('rating', 'EXCELLENT')
        factors = score_info.get('factors', {})
        props['total_complaints'] = factors.get('total_complaints', 0)
        props['resolved_count'] = factors.get('resolved_count', 0)
        props['overdue_count'] = factors.get('overdue_count', 0)
        props['high_priority_pending'] = factors.get('high_priority_pending', 0)

    # Active Hotspots
    hotspots = Hotspot.query.filter_by(active=True).all()
    hotspot_data = [h.to_dict() for h in hotspots]

    # Public complaints - slightly fuzz exact GPS by ~20m for privacy and exclude citizen PII
    complaints = Complaint.query.filter(Complaint.status != 'REJECTED').all()
    complaint_markers = []
    for c in complaints:
        # Privacy-safe generalized point
        complaint_markers.append({
            'id': c.id,
            'complaint_code': c.complaint_code,
            'category_name': c.category.name if c.category else 'Civic Issue',
            'status': c.status,
            'priority': c.priority,
            'latitude': round(c.latitude, 4),  # generalized ~10m
            'longitude': round(c.longitude, 4),
            'ward_name': c.ward.ward_name if c.ward else None,
            'ward_number': c.ward.ward_number if c.ward else None,
            'created_at': c.created_at.isoformat() if c.created_at else None
        })

    return jsonify({
        'wards_geojson': geojson,
        'hotspots': hotspot_data,
        'complaint_markers': complaint_markers
    }), 200

@public_map_bp.route('/wards/<int:ward_id>/stats', methods=['GET'])
def get_ward_stats(ward_id):
    ward = Ward.query.get_or_404(ward_id)
    score_data = health_score_service.compute_ward_score(ward.id)

    pending = Complaint.query.filter_by(ward_id=ward.id).filter(Complaint.status.in_(['SUBMITTED', 'ASSIGNED', 'REOPENED'])).count()
    in_progress = Complaint.query.filter_by(ward_id=ward.id, status='IN_PROGRESS').count()
    verification = Complaint.query.filter_by(ward_id=ward.id, status='VERIFICATION_PENDING').count()
    resolved = Complaint.query.filter_by(ward_id=ward.id, status='RESOLVED').count()

    return jsonify({
        'ward': ward.to_dict(include_geom=False),
        'health_score': score_data['health_score'],
        'rating': score_data['rating'],
        'factors': score_data['factors'],
        'status_counts': {
            'pending': pending,
            'in_progress': in_progress,
            'verification_pending': verification,
            'resolved': resolved,
            'total': pending + in_progress + verification + resolved
        }
    }), 200
