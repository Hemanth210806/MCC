import React from 'react';
import { Check, Clock, AlertCircle, FileCheck, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const STEPS = [
  { key: 'SUBMITTED', labelEn: 'Submitted', labelKn: 'ಸಲ್ಲಿಸಲಾಗಿದೆ' },
  { key: 'ASSIGNED', labelEn: 'Assigned', labelKn: 'ನಿಯೋಜಿಸಲಾಗಿದೆ' },
  { key: 'IN_PROGRESS', labelEn: 'In Progress', labelKn: 'ಪ್ರಗತಿಯಲ್ಲಿದೆ' },
  { key: 'VERIFICATION_PENDING', labelEn: 'Verification', labelKn: 'ಪರಿಶೀಲನೆ' },
  { key: 'RESOLVED', labelEn: 'Resolved', labelKn: 'ಪರಿಹಾರವಾಗಿದೆ' }
];

export default function StatusTimeline({ currentStatus, timeline = [] }) {
  const { language } = useLanguage();
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
          backgroundColor: isOverdue ? '#dc2626' : '#4b5e28',
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
                backgroundColor: isCurrent ? (isOverdue ? '#fef2f2' : '#edf4e4') : (isCompleted ? '#4b5e28' : '#ffffff'),
                border: `2px solid ${isCurrent ? (isOverdue ? '#dc2626' : '#4b5e28') : (isCompleted ? '#4b5e28' : '#e5dcbe')}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isCurrent ? (isOverdue ? '#b91c1c' : '#36481e') : (isCompleted ? '#ffffff' : '#8e9683'),
                fontWeight: 800,
                fontSize: '0.85rem',
                boxShadow: isCurrent ? '0 0 0 4px rgba(75, 94, 40, 0.18)' : 'none'
              }}>
                {isCompleted ? <Check size={18} /> : (idx + 1)}
              </div>
              <span style={{
                fontSize: '0.75rem',
                marginTop: '6px',
                fontWeight: isCurrent ? 800 : 600,
                color: isCurrent ? '#36481e' : '#5e6654',
                textAlign: 'center'
              }}>
                {language === 'kn' ? step.labelKn : step.labelEn}
              </span>
            </div>
          );
        })}
      </div>

      {/* History Log */}
      {timeline.length > 0 && (
        <div style={{ borderLeft: '2px solid #e5dcbe', marginLeft: '18px', paddingLeft: '16px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4b5e28', marginBottom: '8px' }}>
            {language === 'kn' ? 'ಘಟನೆಗಳ ಲಾಗ್ ಮತ್ತು ಆಡಿಟ್ ಇತಿಹಾಸ:' : 'Event Log & Audit History:'}
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
                  {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                </span>
              </div>
              {item.remarks && (
                <div style={{ fontSize: '0.82rem', color: '#4a5040', marginTop: '3px' }}>
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
