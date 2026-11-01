import React from 'react';
import PriorityBadge from './PriorityBadge';
import ComplaintProgressBar from './ComplaintProgressBar';
import { getImageUrl, getCategoryFallback } from '../utils/imageUrl';
import { MapPin, Calendar, Building, Clock, ArrowRight } from 'lucide-react';
import { formatDateTime } from '../utils/exifHelper';

export default function ComplaintCard({ complaint, onSelect, actionLabel = 'View Details' }) {
  const photoUrl = complaint.images && complaint.images.length > 0 
    ? getImageUrl(complaint.images[0].image_path, complaint.category_name, false)
    : getCategoryFallback(complaint.category_name, false);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#ffffff', borderColor: '#e5dcbe', boxShadow: '0 2px 8px rgba(75, 94, 40, 0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b38328' }}>
            {complaint.complaint_code}
          </span>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1f241a', marginTop: '2px' }}>
            {complaint.category_name}
          </h4>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <PriorityBadge priority={complaint.priority} score={complaint.priority_score} reasons={complaint.priority_reasons} />
          <span className={`badge badge-${complaint.status}`}>{complaint.status.replace('_', ' ')}</span>
        </div>
      </div>

      {photoUrl && (
        <div style={{ height: '140px', width: '100%', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f5efe1', border: '1.5px solid #e5dcbe' }}>
          <img 
            src={photoUrl} 
            alt={complaint.category_name} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            onError={(e) => { 
              const fb = getCategoryFallback(complaint.category_name, false);
              if (e.target.src !== fb) {
                e.target.src = fb;
              } else {
                e.target.style.display = 'none';
              }
            }}
          />
        </div>
      )}

      {complaint.description && (
        <p style={{ fontSize: '0.85rem', color: '#4a5040', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {complaint.description}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.78rem', color: '#5e6654', borderTop: '1.5px solid #e8dfc9', paddingTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <MapPin size={14} style={{ color: '#4b5e28' }} />
          <span>{complaint.ward_name || `Ward ${complaint.ward_number || 'N/A'}`}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Building size={14} style={{ color: '#b38328' }} />
          <span>{complaint.department_name || 'Department'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Calendar size={14} />
          <span>{formatDateTime(complaint.created_at)}</span>
        </div>
        {complaint.sla_due_at && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: complaint.status === 'OVERDUE' ? '#dc2626' : '#5e6654' }}>
            <Clock size={14} />
            <span>SLA: {formatDateTime(complaint.sla_due_at)}</span>
          </div>
        )}
      </div>

      {complaint.report_count && complaint.report_count > 1 && (
        <div style={{ fontSize: '0.72rem', backgroundColor: '#fef5e7', border: '1px solid #b38328', color: '#8f681a', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>
          🔥 Cluster: {complaint.report_count} citizen reports merged at this spot
        </div>
      )}

      {/* Visual Progress Bar Component */}
      <ComplaintProgressBar complaint={complaint} mode="compact" />

      {onSelect && (
        <button 
          onClick={() => onSelect(complaint)}
          className="btn btn-outline"
          style={{ width: '100%', marginTop: '4px', fontSize: '0.85rem', borderColor: '#4b5e28', color: '#3d4d20' }}
        >
          {actionLabel} <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}
