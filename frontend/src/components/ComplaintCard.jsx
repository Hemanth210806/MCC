import React from 'react';
import PriorityBadge from './PriorityBadge';
import { MapPin, Calendar, Building, Clock, ArrowRight } from 'lucide-react';

export default function ComplaintCard({ complaint, onSelect, actionLabel = 'View Details' }) {
  const photoUrl = complaint.images && complaint.images.length > 0 
    ? `http://localhost:5000${complaint.images[0].image_path}`
    : null;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
            {complaint.complaint_code}
          </span>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
            {complaint.category_name}
          </h4>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <PriorityBadge priority={complaint.priority} score={complaint.priority_score} reasons={complaint.priority_reasons} />
          <span className={`badge badge-${complaint.status}`}>{complaint.status.replace('_', ' ')}</span>
        </div>
      </div>

      {photoUrl && (
        <div style={{ height: '140px', width: '100%', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
          <img 
            src={photoUrl} 
            alt={complaint.category_name} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      )}

      {complaint.description && (
        <p style={{ fontSize: '0.85rem', color: '#475569', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {complaint.description}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.78rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <MapPin size={14} style={{ color: '#1e3a8a' }} />
          <span>{complaint.ward_name || `Ward ${complaint.ward_number || 'N/A'}`}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Building size={14} style={{ color: '#0d9488' }} />
          <span>{complaint.department_name || 'Department'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Calendar size={14} />
          <span>{complaint.created_at ? new Date(complaint.created_at).toLocaleDateString() : ''}</span>
        </div>
        {complaint.sla_due_at && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: complaint.status === 'OVERDUE' ? '#e11d48' : '#64748b' }}>
            <Clock size={14} />
            <span>SLA: {new Date(complaint.sla_due_at).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {onSelect && (
        <button 
          onClick={() => onSelect(complaint)}
          className="btn btn-outline"
          style={{ width: '100%', marginTop: '4px', fontSize: '0.85rem' }}
        >
          {actionLabel} <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}
