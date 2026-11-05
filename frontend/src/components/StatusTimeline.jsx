import React from 'react';
import { Check, Clock, AlertCircle, FileCheck, RefreshCw } from 'lucide-react';
import { formatDateTime } from '../utils/exifHelper';

const STEPS = [
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'VERIFICATION_PENDING', label: 'Verification' },
  { key: 'RESOLVED', label: 'Resolved' }
];

export default function StatusTimeline({ currentStatus, timeline = [] }) {
  const isOverdue = currentStatus === 'OVERDUE';
  const isReopened = currentStatus === 'REOPENED';

  const getStepIndex = (status) => {
    if (status === 'REOPENED') return 2; // back in progress
    if (status === 'OVERDUE') return 2;
    const idx = STEPS.findIndex(s => s.key === status);
    return idx !== -1 ? idx : 0;
  };

  const currentIndex = getStepIndex(currentStatus);

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Visual Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', marginBottom: '28px' }}>
        <div style={{
          position: 'absolute',
          top: '18px',
          left: '20px',
          right: '20px',
          height: '3px',
          backgroundColor: '#e5dcbe',
          zIndex: 1
        }} />

        <div style={{
          position: 'absolute',
          top: '18px',
          left: '20px',
          width: `${(currentIndex / (STEPS.length - 1)) * 100}%`,
          height: '3px',
          backgroundColor: isOverdue ? '#e11d48' : '#4b5e28',
          transition: 'width 0.4s ease',
          zIndex: 2
        }} />

        {STEPS.map((step, idx) => {
          const isCompleted = idx <= currentIndex && !isOverdue;
          const isCurrent = idx === currentIndex;

          return (
            <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3, width: '70px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: isCurrent ? (isOverdue ? '#fee2e2' : '#edf4e4') : (isCompleted ? '#4b5e28' : '#ffffff'),
                border: `2px solid ${isCurrent ? (isOverdue ? '#e11d48' : '#4b5e28') : (isCompleted ? '#4b5e28' : '#dcd3b8')}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isCurrent ? (isOverdue ? '#e11d48' : '#4b5e28') : (isCompleted ? '#ffffff' : '#94a3b8'),
                fontWeight: 700,
                fontSize: '0.85rem',
                boxShadow: isCurrent ? '0 0 0 4px rgba(75, 94, 40, 0.15)' : 'none'
              }}>
                {isCompleted ? <Check size={18} /> : (idx + 1)}
              </div>
              <span style={{
                fontSize: '0.75rem',
                marginTop: '6px',
                fontWeight: isCurrent ? 700 : 500,
                color: isCurrent ? '#1f241a' : '#5e6654',
                textAlign: 'center'
              }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* History Log */}
      {timeline.length > 0 && (
        <div style={{ borderLeft: '2px solid #e5dcbe', marginLeft: '18px', paddingLeft: '16px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
            Event Log & Audit History:
          </div>
          {timeline.map((item, i) => (
            <div key={i} style={{ marginBottom: '10px', position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '-22px',
                top: '4px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#4b5e28'
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge badge-${item.new_status}`} style={{ fontSize: '0.65rem' }}>
                  {item.new_status}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#5e6654' }}>
                  {item.created_at ? formatDateTime(item.created_at) : ''}
                </span>
              </div>
              {item.remarks && (
                <div style={{ fontSize: '0.8rem', color: '#1e293b', marginTop: '2px' }}>
                  {item.remarks}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
