import React from 'react';
import { Clock, CheckCircle2, AlertTriangle, ShieldAlert, Sparkles, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const LIFECYCLE_STAGES = [
  { key: 'SUBMITTED', id: 1, labelEn: 'Submitted', labelKn: 'ಸಲ್ಲಿಸಲಾಗಿದೆ', shortEn: 'Logged', shortKn: 'ದಾಖಲು' },
  { key: 'ASSIGNED', id: 2, labelEn: 'Assigned', labelKn: 'ನಿಯೋಜಿಸಲಾಗಿದೆ', shortEn: 'Assigned', shortKn: 'ನಿಯೋಜನೆ' },
  { key: 'IN_PROGRESS', id: 3, labelEn: 'In Progress', labelKn: 'ಪ್ರಗತಿಯಲ್ಲಿದೆ', shortEn: 'Working', shortKn: 'ಪ್ರಗತಿ' },
  { key: 'VERIFICATION_PENDING', id: 4, labelEn: 'Verification', labelKn: 'ಪರಿಶೀಲನೆ', shortEn: 'Verify', shortKn: 'ಪರಿಶೀಲನೆ' },
  { key: 'RESOLVED', id: 5, labelEn: 'Resolved', labelKn: 'ಪರಿಹಾರವಾಗಿದೆ', shortEn: 'Resolved', shortKn: 'ಪರಿಹಾರ' }
];

/**
 * Calculates remaining SLA time and formatted duration string
 */
export function calculateSLAMetrics(complaint) {
  if (!complaint) {
    return {
      isResolved: false,
      isOverdue: false,
      remainingMs: 0,
      remainingText: 'N/A',
      remainingTextKn: 'ಲಭ್ಯವಿಲ್ಲ',
      percentUsed: 0,
      percentRemaining: 100,
      slaColor: '#4b5e28',
      totalHours: 24,
      dueFormatted: 'N/A'
    };
  }

  const isResolved = complaint.status === 'RESOLVED';
  const isOverdueStatus = complaint.status === 'OVERDUE';
  const now = Date.now();

  const createdTime = complaint.created_at ? new Date(complaint.created_at).getTime() : now - 3600000;
  
  // Default SLA duration based on priority if not specified
  const priorityHours = complaint.priority === 'HIGH' ? 24 : (complaint.priority === 'MEDIUM' ? 72 : 168);
  const dueTime = complaint.sla_due_at 
    ? new Date(complaint.sla_due_at).getTime() 
    : (createdTime + priorityHours * 3600000);

  const totalWindowMs = Math.max(dueTime - createdTime, 3600000);
  const totalHours = Math.round(totalWindowMs / 3600000);

  const resolvedTime = isResolved && (complaint.resolution_evidence?.verified_at || complaint.resolution_evidence?.submitted_at)
    ? new Date(complaint.resolution_evidence.verified_at || complaint.resolution_evidence.submitted_at).getTime()
    : null;

  const effectiveEndTime = isResolved && resolvedTime ? resolvedTime : now;
  const elapsedMs = Math.max(0, effectiveEndTime - createdTime);
  const remainingMs = dueTime - effectiveEndTime;
  const isOverdue = isOverdueStatus || (!isResolved && remainingMs <= 0);

  // SLA Percent calculation
  let percentUsed = 0;
  if (isResolved) {
    percentUsed = Math.min(100, Math.round((elapsedMs / totalWindowMs) * 100));
  } else if (isOverdue) {
    percentUsed = 100;
  } else {
    percentUsed = Math.min(100, Math.max(2, Math.round((elapsedMs / totalWindowMs) * 100)));
  }
  const percentRemaining = Math.max(0, 100 - percentUsed);

  // Human friendly remaining duration formatting
  let remainingText = '';
  let remainingTextKn = '';

  if (isResolved) {
    const wasWithinSLA = (resolvedTime || effectiveEndTime) <= dueTime;
    if (wasWithinSLA) {
      remainingText = 'Resolved within SLA';
      remainingTextKn = 'ಕಾಲಮಿತಿಯೊಳಗೆ ಪರಿಹಾರಗೊಂಡಿದೆ';
    } else {
      remainingText = 'Resolved (After SLA)';
      remainingTextKn = 'ಪರಿಹಾರಗೊಂಡಿದೆ (ಕಾಲಮಿತಿ ನಂತರ)';
    }
  } else if (isOverdue) {
    const overdueMs = Math.abs(remainingMs);
    const overdueHrs = Math.floor(overdueMs / 3600000);
    const overdueMins = Math.floor((overdueMs % 3600000) / 60000);

    if (overdueHrs >= 24) {
      const overdueDays = Math.floor(overdueHrs / 24);
      const remHours = overdueHrs % 24;
      remainingText = `Overdue by ${overdueDays}d ${remHours}h`;
      remainingTextKn = `${overdueDays} ದಿನ ${remHours} ಗಂ ಮೀರಿದೆ`;
    } else if (overdueHrs > 0) {
      remainingText = `Overdue by ${overdueHrs}h ${overdueMins}m`;
      remainingTextKn = `${overdueHrs} ಗಂ ${overdueMins} ನಿಮಿಷ ಮೀರಿದೆ`;
    } else {
      remainingText = `Overdue by ${Math.max(1, overdueMins)}m`;
      remainingTextKn = `${Math.max(1, overdueMins)} ನಿಮಿಷ ಮೀರಿದೆ`;
    }
  } else {
    const hrs = Math.floor(remainingMs / 3600000);
    const mins = Math.floor((remainingMs % 3600000) / 60000);

    if (hrs >= 24) {
      const days = Math.floor(hrs / 24);
      const remHrs = hrs % 24;
      remainingText = `${days}d ${remHrs}h remaining`;
      remainingTextKn = `${days} ದಿನ ${remHrs} ಗಂ ಬಾಕಿ`;
    } else if (hrs > 0) {
      remainingText = `${hrs}h ${mins}m remaining`;
      remainingTextKn = `${hrs} ಗಂ ${mins} ನಿಮಿಷ ಬಾಕಿ`;
    } else {
      remainingText = `${Math.max(1, mins)}m remaining`;
      remainingTextKn = `${Math.max(1, mins)} ನಿಮಿಷ ಬಾಕಿ`;
    }
  }

  // Determine SLA Health Color
  let slaColor = '#4b5e28'; // Healthy Royal Olive Green
  if (isResolved) {
    slaColor = '#2e7d32'; // Forest Green
  } else if (isOverdue) {
    slaColor = '#dc2626'; // Alert Red
  } else if (percentRemaining <= 20) {
    slaColor = '#e11d48'; // Urgent Rose/Red
  } else if (percentRemaining <= 40) {
    slaColor = '#d97706'; // Warning Amber/Gold
  }

  // Format Due Date
  let dueFormatted = 'N/A';
  try {
    const d = new Date(dueTime);
    dueFormatted = d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    dueFormatted = 'SLA Scheduled';
  }

  return {
    isResolved,
    isOverdue,
    remainingMs,
    remainingText,
    remainingTextKn,
    percentUsed,
    percentRemaining,
    slaColor,
    totalHours,
    dueFormatted
  };
}

/**
 * Gets stage index (1-based, 1 to 5) for current complaint status
 */
export function getLifecycleStageInfo(status) {
  if (status === 'RESOLVED') return { stageIndex: 5, stageKey: 'RESOLVED', labelEn: 'Resolved', labelKn: 'ಪರಿಹಾರವಾಗಿದೆ' };
  if (status === 'VERIFICATION_PENDING') return { stageIndex: 4, stageKey: 'VERIFICATION_PENDING', labelEn: 'Verification Pending', labelKn: 'ಪರಿಶೀಲನೆ ಬಾಕಿ' };
  if (status === 'IN_PROGRESS' || status === 'OVERDUE' || status === 'REOPENED') return { stageIndex: 3, stageKey: 'IN_PROGRESS', labelEn: 'In Progress', labelKn: 'ಪ್ರಗತಿಯಲ್ಲಿದೆ' };
  if (status === 'ASSIGNED') return { stageIndex: 2, stageKey: 'ASSIGNED', labelEn: 'Department Assigned', labelKn: 'ಇಲಾಖೆಗೆ ನಿಯೋಜಿಸಲಾಗಿದೆ' };
  return { stageIndex: 1, stageKey: 'SUBMITTED', labelEn: 'Report Submitted', labelKn: 'ದೂರು ದಾಖಲಾಗಿದೆ' };
}

export default function ComplaintProgressBar({ complaint, mode = 'compact' }) {
  const { language } = useLanguage();
  if (!complaint) return null;

  const sla = calculateSLAMetrics(complaint);
  const stage = getLifecycleStageInfo(complaint.status);
  const isCompact = mode === 'compact';

  // Calculate lifecycle progress percentage (1=20%, 2=40%, 3=60%, 4=80%, 5=100%)
  const lifecyclePct = (stage.stageIndex / 5) * 100;

  return (
    <div style={{
      width: '100%',
      backgroundColor: '#fbf9f2',
      border: '1.5px solid #e7dec6',
      borderRadius: '10px',
      padding: isCompact ? '10px 12px' : '16px 18px',
      marginTop: isCompact ? '8px' : '16px',
      marginBottom: isCompact ? '4px' : '16px',
      boxShadow: '0 1px 4px rgba(75, 94, 40, 0.04)'
    }}>
      {/* Top Header: Current Lifecycle Stage & SLA Remaining Badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '8px'
      }}>
        {/* Stage Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            backgroundColor: '#ede7d4',
            color: '#4b5e28',
            padding: '2px 7px',
            borderRadius: '5px'
          }}>
            {language === 'kn' ? `ಹಂತ ${stage.stageIndex}/೫` : `Stage ${stage.stageIndex} of 5`}
          </span>
          <span style={{
            fontSize: isCompact ? '0.82rem' : '0.9rem',
            fontWeight: 700,
            color: '#1f241a'
          }}>
            {language === 'kn' ? stage.labelKn : stage.labelEn}
          </span>
        </div>

        {/* SLA Status & Remaining Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 9px',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 700,
          backgroundColor: sla.isResolved 
            ? '#eaf4e7' 
            : (sla.isOverdue ? '#fee2e2' : (sla.percentRemaining <= 25 ? '#fff1f2' : '#fef8eb')),
          color: sla.isResolved 
            ? '#216e25' 
            : (sla.isOverdue ? '#b91c1c' : (sla.percentRemaining <= 25 ? '#be123c' : '#8f681a')),
          border: `1px solid ${
            sla.isResolved 
              ? '#b5dfac' 
              : (sla.isOverdue ? '#fca5a5' : (sla.percentRemaining <= 25 ? '#fda4af' : '#f0d8a8'))
          }`
        }}>
          {sla.isResolved ? (
            <CheckCircle2 size={13} color="#216e25" />
          ) : sla.isOverdue ? (
            <ShieldAlert size={13} color="#b91c1c" />
          ) : (
            <Clock size={13} color={sla.slaColor} />
          )}
          <span>
            {language === 'kn' ? sla.remainingTextKn : sla.remainingText}
          </span>
        </div>
      </div>

      {/* Visual Lifecycle Stepper Progress Bar (Segmented 5 Stages) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '4px',
        marginBottom: '8px'
      }}>
        {LIFECYCLE_STAGES.map((step) => {
          const isPassed = step.id < stage.stageIndex;
          const isCurrent = step.id === stage.stageIndex;
          const isUpcoming = step.id > stage.stageIndex;

          let segBg = '#e6dcbf';
          if (sla.isResolved) {
            segBg = '#3b7a2d';
          } else if (isPassed) {
            segBg = '#4b5e28';
          } else if (isCurrent) {
            segBg = sla.isOverdue ? '#dc2626' : '#b38328';
          }

          return (
            <div key={step.key} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{
                height: isCompact ? '6px' : '8px',
                borderRadius: '3px',
                backgroundColor: segBg,
                transition: 'all 0.3s ease',
                boxShadow: isCurrent ? `0 0 6px ${sla.isOverdue ? 'rgba(220, 38, 38, 0.4)' : 'rgba(179, 131, 40, 0.4)'}` : 'none'
              }} />
              {!isCompact && (
                <div style={{
                  fontSize: '0.68rem',
                  fontWeight: isCurrent ? 800 : (isPassed ? 700 : 500),
                  color: isCurrent ? '#1f241a' : (isPassed ? '#4b5e28' : '#88917e'),
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textAlign: 'center',
                  marginTop: '2px'
                }}>
                  {language === 'kn' ? step.shortKn : step.shortEn}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Secondary Metric Bar: Remaining SLA Window Meter */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e9e1cc',
        borderRadius: '7px',
        padding: '6px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.73rem',
          color: '#5e6654'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontWeight: 700, color: '#3d4d20' }}>
              {language === 'kn' ? 'ಎಸ್.ಎಲ್.ಎ ಕಾಲಮಿತಿ:' : 'SLA Target:'}
            </span>
            <span>{sla.totalHours}h ({complaint.priority || 'NORMAL'})</span>
          </span>
          <span style={{ fontWeight: 700, color: sla.isOverdue ? '#b91c1c' : '#1f241a' }}>
            {sla.isResolved 
              ? (language === 'kn' ? '೧೦೦% ಪೂರ್ಣ' : '100% Completed') 
              : sla.isOverdue 
                ? (language === 'kn' ? '⚠️ ಕಾಲಮಿತಿ ಉಲ್ಲಂಘನೆ' : '⚠️ SLA Breached')
                : (language === 'kn' ? `${sla.percentRemaining}% ಸಮಯ ಬಾಕಿ ಇದೆ` : `${sla.percentRemaining}% time remaining`)}
          </span>
        </div>

        {/* Continuous SLA Timer Bar */}
        <div style={{
          width: '100%',
          height: '5px',
          backgroundColor: '#ebe4d0',
          borderRadius: '9999px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            width: `${sla.isResolved ? 100 : (sla.isOverdue ? 100 : sla.percentUsed)}%`,
            height: '100%',
            backgroundColor: sla.slaColor,
            borderRadius: '9999px',
            transition: 'width 0.5s ease',
            backgroundImage: sla.isOverdue 
              ? 'repeating-linear-gradient(45deg, #dc2626, #dc2626 10px, #b91c1c 10px, #b91c1c 20px)' 
              : 'none'
          }} />
        </div>

        {/* Footer Subtext */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.7rem',
          color: '#7a8570',
          marginTop: '1px'
        }}>
          <span>
            {language === 'kn' ? 'ಅಂತಿಮ ದಿನಾಂಕ:' : 'Resolution Due:'}{' '}
            <strong style={{ color: sla.isOverdue ? '#b91c1c' : '#4b5e28' }}>{sla.dueFormatted}</strong>
          </span>
          <span>
            {complaint.department_name ? complaint.department_name : 'MCC SLA Queue'}
          </span>
        </div>
      </div>
    </div>
  );
}
