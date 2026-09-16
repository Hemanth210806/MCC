import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export default function PriorityBadge({ priority, score, reasons = [], showReasons = false }) {
  const [openTooltip, setOpenTooltip] = useState(false);

  const getIcon = () => {
    switch (priority) {
      case 'HIGH': return <AlertCircle size={14} />;
      case 'MEDIUM': return <AlertTriangle size={14} />;
      case 'LOW': return <CheckCircle size={14} />;
      default: return <Info size={14} />;
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <span 
        className={`badge badge-priority-${priority || 'MEDIUM'}`}
        style={{ cursor: reasons && reasons.length > 0 ? 'pointer' : 'default' }}
        onClick={() => setOpenTooltip(!openTooltip)}
        onMouseEnter={() => setOpenTooltip(true)}
        onMouseLeave={() => setOpenTooltip(false)}
      >
        {getIcon()}
        <span>{priority || 'MEDIUM'}</span>
        {score !== undefined && <span style={{ opacity: 0.85 }}>({score})</span>}
      </span>

      {(showReasons || openTooltip) && reasons && reasons.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '0',
          marginTop: '6px',
          width: '260px',
          backgroundColor: '#1e293b',
          color: '#ffffff',
          padding: '10px 12px',
          borderRadius: '8px',
          fontSize: '0.75rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 50,
          pointerEvents: 'none'
        }}>
          <div style={{ fontWeight: 700, marginBottom: '4px', color: '#fbbf24' }}>
            Priority Decision Factors:
          </div>
          <ul style={{ paddingLeft: '14px', margin: 0 }}>
            {reasons.map((r, i) => (
              <li key={i} style={{ marginBottom: '2px' }}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
