import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getImageUrl, getCategoryFallback } from '../utils/imageUrl';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Flame, 
  RefreshCw, 
  AlertTriangle, 
  BarChart3, 
  Users, 
  MapPin, 
  Check, 
  X, 
  Clock, 
  Building,
  Mail,
  Send,
  ShieldCheck
} from 'lucide-react';
import { formatDateTime } from '../utils/exifHelper';

export default function AdminDashboard({ initialTab = 'verification' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [queue, setQueue] = useState([]);
  const [overview, setOverview] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [wardScores, setWardScores] = useState([]);
  const [overdueList, setOverdueList] = useState([]);
  const [ownerDispatches, setOwnerDispatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Verification modal / action
  const [selectedVerify, setSelectedVerify] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [bannerMsg, setBannerMsg] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [qRes, ovRes, hRes, rRes, wRes, odRes, dRes] = await Promise.all([
        api.get('/admin/verification-queue'),
        api.get('/admin/analytics/overview'),
        api.get('/admin/analytics/hotspots'),
        api.get('/admin/analytics/recurring-issues'),
        api.get('/admin/analytics/ward-health-scores'),
        api.get('/admin/analytics/sla-overdue'),
        api.get('/admin/owner-dispatches')
      ]);
      setQueue(qRes.data.queue || []);
      setOverview(ovRes.data);
      setHotspots(hRes.data.hotspots || []);
      setRecurring(rRes.data.recurring_issues || []);
      setWardScores(wRes.data.scores || []);
      setOverdueList(odRes.data.overdue_complaints || []);
      setOwnerDispatches(dRes.data.dispatches || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVerify = async (decision) => {
    if (!selectedVerify) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/complaints/${selectedVerify.complaint_id}/verify`, {
        decision: decision,
        notes: adminNotes
      });
      setBannerMsg({
        type: 'success',
        text: `Resolution successfully ${decision === 'approve' ? 'APPROVED (Status: RESOLVED)' : 'REJECTED (Status: REOPENED)'}.`
      });
      setSelectedVerify(null);
      setAdminNotes('');
      loadData();
    } catch (err) {
      setBannerMsg({ type: 'error', text: err.response?.data?.error || 'Verification action failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecalculateHotspots = async () => {
    try {
      const res = await api.post('/admin/analytics/recalculate-hotspots');
      setBannerMsg({ type: 'success', text: res.data.message });
      loadData();
    } catch (err) {
      setBannerMsg({ type: 'error', text: 'Failed to recalculate hotspots' });
    }
  };

  return (
    <div className="container" style={{ padding: '30px 20px' }}>
      {bannerMsg && (
        <div style={{
          backgroundColor: bannerMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1.5px solid ${bannerMsg.type === 'success' ? '#86efac' : '#fca5a5'}`,
          color: bannerMsg.type === 'success' ? '#166534' : '#b91c1c',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.88rem',
          fontWeight: 600,
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{bannerMsg.text}</span>
          <button 
            onClick={() => setBannerMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4b5e28' }}>
            MCC ADMINISTRATIVE CONTROL
          </span>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1f241a' }}>
            City Administration & Verification Console
          </h2>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setActiveTab('verification')}
            className={`btn ${activeTab === 'verification' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <CheckCircle2 size={16} /> Verification Queue ({queue.length})
          </button>
          <button 
            onClick={() => setActiveTab('overview')}
            className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <BarChart3 size={16} /> Overview
          </button>
          <button 
            onClick={() => setActiveTab('hotspots')}
            className={`btn ${activeTab === 'hotspots' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <Flame size={16} /> Hotspots ({hotspots.length})
          </button>
          <button 
            onClick={() => setActiveTab('recurring')}
            className={`btn ${activeTab === 'recurring' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <RefreshCw size={16} /> Recurring ({recurring.length})
          </button>
          <button 
            onClick={() => setActiveTab('overdue')}
            className={`btn ${activeTab === 'overdue' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <Clock size={16} /> Overdue ({overdueList.length})
          </button>
          <button 
            onClick={() => setActiveTab('owner-mails')}
            className={`btn ${activeTab === 'owner-mails' ? 'btn-primary' : 'btn-outline'}`}
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              backgroundColor: activeTab === 'owner-mails' ? '#4b5e28' : '#fffdf6',
              borderColor: '#d4af37',
              color: activeTab === 'owner-mails' ? '#ffffff' : '#715511',
              fontWeight: 700
            }}
          >
            <Mail size={16} /> Login Mails ({ownerDispatches.length})
          </button>
        </div>
      </div>

      {/* 1. Verification Queue Tab */}
      {activeTab === 'verification' && (
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f241a', marginBottom: '14px' }}>
            Pending Resolution Approvals ({queue.length})
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
            Field Officers must provide geotagged resolution photographs. Compare the initial complaint photo against resolution proof before approving.
          </p>

          {queue.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              No resolutions currently pending verification. All officer reports are reviewed!
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
              {queue.map((item) => (
                <div key={item.complaint_id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{item.complaint_code}</span>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1f241a' }}>{item.category_name}</h4>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Ward: <strong>{item.ward_name}</strong>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                        Submitted: <strong>{formatDateTime(item.submitted_at || item.created_at)}</strong>
                      </div>
                    </div>
                    <span className="badge badge-VERIFICATION_PENDING">Pending Verification</span>
                  </div>

                  {/* Side-by-side thumbnails */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>ORIGINAL ISSUE</div>
                      <div style={{ height: '120px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
                        <img 
                          src={getImageUrl(item.original_photo, item.category_name, false)} 
                          alt="Original" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { 
                            const fb = getCategoryFallback(item.category_name, false);
                            if (e.target.src !== fb) e.target.src = fb;
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                        GPS: {item.original_latitude?.toFixed(4)}, {item.original_longitude?.toFixed(4)}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>OFFICER RESOLUTION</div>
                      <div style={{ height: '120px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
                        <img 
                          src={getImageUrl(item.resolution_photo, item.category_name, true)} 
                          alt="Resolution" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { 
                            const fb = getCategoryFallback(item.category_name, true);
                            if (e.target.src !== fb) e.target.src = fb;
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#166534', marginTop: '2px' }}>
                        Distance: <strong>{item.distance_from_original_m}m</strong>
                      </div>
                    </div>
                  </div>

                  {item.officer_notes && (
                    <div style={{ fontSize: '0.8rem', backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
                      <strong>Officer Note:</strong> {item.officer_notes}
                    </div>
                  )}

                  <button 
                    onClick={() => setSelectedVerify(item)}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '8px', fontSize: '0.85rem' }}
                  >
                    Inspect & Decide
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Overview Tab */}
      {activeTab === 'overview' && overview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="card">
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Complaints</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1f241a' }}>{overview.total_complaints}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Resolved</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#16a34a' }}>{overview.resolved_count}</div>
              <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>{overview.resolution_rate_pct}% success rate</div>
            </div>
            <div className="card">
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>In Progress</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#b45309' }}>{overview.in_progress_count}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Overdue</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#dc2626' }}>{overview.overdue_count}</div>
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div className="card">
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1f241a', marginBottom: '14px' }}>
              Category Distribution
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {overview.category_breakdown?.map((cat, i) => (
                <div key={i} style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>{cat.category}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4b5e28', marginTop: '4px' }}>{cat.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Department Performance */}
          <div className="card">
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1f241a', marginBottom: '14px' }}>
              Department SLA Performance
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '10px' }}>Department</th>
                    <th style={{ padding: '10px' }}>Total</th>
                    <th style={{ padding: '10px' }}>Resolved</th>
                    <th style={{ padding: '10px' }}>Overdue</th>
                    <th style={{ padding: '10px' }}>Resolution Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.department_performance?.map((d) => (
                    <tr key={d.department_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', fontWeight: 600, color: '#1f241a' }}>{d.department_name}</td>
                      <td style={{ padding: '10px' }}>{d.total}</td>
                      <td style={{ padding: '10px', color: '#16a34a', fontWeight: 600 }}>{d.resolved}</td>
                      <td style={{ padding: '10px', color: d.overdue > 0 ? '#dc2626' : '#64748b', fontWeight: 600 }}>{d.overdue}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ fontWeight: 700, color: d.resolution_rate >= 75 ? '#16a34a' : '#b45309' }}>
                          {d.resolution_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Hotspots Tab */}
      {activeTab === 'hotspots' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f241a' }}>
                Civic Hotspot Clusters (DBSCAN)
              </h3>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Geospatial clusters of persistent civic complaints detected via density-based spatial clustering.
              </div>
            </div>
            <button 
              onClick={handleRecalculateHotspots}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <RefreshCw size={15} /> Recalculate Hotspots
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {hotspots.map((h) => (
              <div key={h.id} className="card" style={{ borderLeft: '4px solid #dc2626' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}>🔥 DBSCAN CLUSTER</span>
                  <span className="badge badge-priority-HIGH" style={{ fontSize: '0.65rem' }}>Active</span>
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1f241a' }}>{h.category_name}</h4>
                <div style={{ fontSize: '0.85rem', color: '#475569', margin: '4px 0' }}>Ward: <strong>{h.ward_name}</strong></div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Complaints Clustered: <strong>{h.complaint_count}</strong><br />
                  Radius: <strong>{Math.round(h.radius_m)} meters</strong>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '8px' }}>
                  Center: {h.center_lat.toFixed(4)}, {h.center_lng.toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Recurring Issues Tab */}
      {activeTab === 'recurring' && (
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f241a', marginBottom: '8px' }}>
            Geographic Recurring Issues
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
            Complaints of the same category reported within 50m of a previously resolved complaint within 90 days.
          </p>

          <div className="card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '10px' }}>Category</th>
                  <th style={{ padding: '10px' }}>New Complaint</th>
                  <th style={{ padding: '10px' }}>Previously Resolved</th>
                  <th style={{ padding: '10px' }}>Proximity Distance</th>
                  <th style={{ padding: '10px' }}>Detected Date</th>
                </tr>
              </thead>
              <tbody>
                {recurring.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px', fontWeight: 600, color: '#b45309' }}>{r.category_name}</td>
                    <td style={{ padding: '10px', fontWeight: 700 }}>{r.new_complaint_code}</td>
                    <td style={{ padding: '10px', color: '#16a34a' }}>{r.previous_complaint_code}</td>
                    <td style={{ padding: '10px' }}>
                      <span className="badge badge-priority-HIGH" style={{ fontSize: '0.7rem' }}>
                        {r.distance_m} meters
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: '#64748b' }}>
                      {formatDateTime(r.detected_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. SLA Overdue Tab */}
      {activeTab === 'overdue' && (
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626', marginBottom: '8px' }}>
            SLA Escalated Overdue Complaints ({overdueList.length})
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
            Complaints that exceeded the configured SLA target hours (24h HIGH, 72h MEDIUM, 168h LOW) without resolution.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {overdueList.map((c) => (
              <div key={c.id} className="card" style={{ borderLeft: '4px solid #dc2626' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{c.complaint_code}</span>
                  <span className="badge badge-OVERDUE">OVERDUE</span>
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1f241a', margin: '4px 0' }}>{c.category_name}</h4>
                <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                  Ward: <strong>{c.ward_name}</strong> | Dept: <strong>{c.department_name}</strong>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: '6px' }}>
                  SLA Target Due: {new Date(c.sla_due_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Owner Security & Login Email Dispatches Tab */}
      {activeTab === 'owner-mails' && (
        <div>
          {/* Owner Identity & Header Card */}
          <div className="card" style={{
            padding: '24px',
            backgroundColor: '#fffdf6',
            border: '2px solid #d4af37',
            marginBottom: '24px',
            boxShadow: '0 4px 16px rgba(212, 175, 55, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #d4af37, #8c6b16)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  boxShadow: '0 3px 8px rgba(140, 107, 22, 0.3)'
                }}>
                  👑
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1f241a', margin: 0 }}>
                      Hemanth K M
                    </h3>
                    <span style={{
                      backgroundColor: '#d4af37',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      textTransform: 'uppercase'
                    }}>
                      Website Owner & Chief Commissioner
                    </span>
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#5e6654', marginTop: '4px' }}>
                    Primary Security Dispatch Recipient: <strong style={{ color: '#4b5e28' }}>hemanthkm2006@gmail.com</strong>
                  </div>
                </div>
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                backgroundColor: '#edf4e4',
                borderRadius: '8px',
                border: '1px solid #a3b88b',
                color: '#2e3d16',
                fontSize: '0.82rem',
                fontWeight: 700
              }}>
                <ShieldCheck size={16} color="#4b5e28" />
                <span>Automated Login Dispatch Protocol Active</span>
              </div>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: '#68735d', marginTop: '14px', lineHeight: 1.5 }}>
              In accordance with security requirements, every staff and administrator authentication event on the Mysuru City Corporation portal automatically triggers an audit email dispatch to <strong>hemanthkm2006@gmail.com</strong>.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1f241a', margin: 0 }}>
              Live Security Dispatch Log ({ownerDispatches.length} alerts dispatched)
            </h4>
            <span style={{ fontSize: '0.78rem', color: '#6e7762' }}>
              Destination Mailbox: <strong>hemanthkm2006@gmail.com</strong>
            </span>
          </div>

          {ownerDispatches.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              No login dispatches recorded yet in this session. Log in as any staff account to see the dispatched alert.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ownerDispatches.map((mail, idx) => (
                <div key={mail.id || idx} className="card" style={{
                  padding: '16px 20px',
                  backgroundColor: '#ffffff',
                  borderColor: '#e2d7ba',
                  boxShadow: '0 2px 8px rgba(75, 94, 40, 0.05)',
                  borderLeft: '4px solid #4b5e28'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '3px 8px',
                          backgroundColor: '#edf4e4',
                          color: '#4b5e28',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 800
                        }}>
                          DISPATCH #{ownerDispatches.length - idx}
                        </span>
                        <strong style={{ fontSize: '0.94rem', color: '#1f241a' }}>
                          {mail.subject}
                        </strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#5e6654', marginTop: '6px' }}>
                        <span>To: <strong style={{ color: '#b38328' }}>{mail.to}</strong></span> • 
                        <span> Authenticated User: <strong>{mail.user_name}</strong> ({mail.user_email})</span> • 
                        <span> Role: <span className="badge badge-ASSIGNED" style={{ fontSize: '0.65rem' }}>{mail.user_role}</span></span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-RESOLVED" style={{ fontSize: '0.72rem' }}>
                        {mail.status || 'Delivered'}
                      </span>
                      <div style={{ fontSize: '0.72rem', color: '#88927e', marginTop: '4px' }}>
                        {mail.formatted_time || mail.timestamp}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    marginTop: '10px',
                    padding: '10px 14px',
                    backgroundColor: '#faf7ee',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    color: '#4e5545',
                    fontFamily: 'monospace'
                  }}>
                    {mail.details || mail.body || `Login verified for ${mail.user_name}. Session active.`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inspection & Decision Modal */}
      {selectedVerify && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '780px', width: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5e28' }}>ADMIN RESOLUTION VERIFICATION</span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1f241a' }}>
                  {selectedVerify.complaint_code}: {selectedVerify.category_name}
                </h3>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Ward: <strong>{selectedVerify.ward_name}</strong> | Officer: <strong>{selectedVerify.officer_name}</strong>
                </div>
              </div>
              <button 
                onClick={() => setSelectedVerify(null)} 
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            {/* Side-by-side Evidence Display */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#475569', marginBottom: '6px' }}>
                  ORIGINAL CITIZEN REPORT
                </div>
                <div style={{ height: '220px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
                  <img 
                    src={getImageUrl(selectedVerify.original_photo, selectedVerify.category_name, false)} 
                    alt="Original" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { 
                      const fb = getCategoryFallback(selectedVerify.category_name, false);
                      if (e.target.src !== fb) e.target.src = fb;
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                  GPS: {selectedVerify.original_latitude?.toFixed(5)}, {selectedVerify.original_longitude?.toFixed(5)}
                </div>
              </div>

              <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#166534', marginBottom: '6px' }}>
                  FIELD OFFICER RESOLUTION PROOF
                </div>
                <div style={{ height: '220px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
                  <img 
                    src={getImageUrl(selectedVerify.resolution_photo, selectedVerify.category_name, true)} 
                    alt="Resolution" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { 
                      const fb = getCategoryFallback(selectedVerify.category_name, true);
                      if (e.target.src !== fb) e.target.src = fb;
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '6px' }}>
                  Resolution GPS: {selectedVerify.resolution_latitude?.toFixed(5)}, {selectedVerify.resolution_longitude?.toFixed(5)}
                </div>
              </div>
            </div>

            {/* Computed Distance Banner */}
            <div style={{
              backgroundColor: selectedVerify.distance_from_original_m <= 50 ? '#dcfce7' : '#fef3c7',
              border: `1px solid ${selectedVerify.distance_from_original_m <= 50 ? '#86efac' : '#fde047'}`,
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Calculated Geotag Distance:</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: selectedVerify.distance_from_original_m <= 50 ? '#166534' : '#b45309' }}>
                  {selectedVerify.distance_from_original_m} meters from original site
                </div>
              </div>
              <span className="badge" style={{ backgroundColor: '#ffffff' }}>
                {selectedVerify.distance_from_original_m <= 50 ? 'Within Geofence (Accurate)' : 'Extended Radius'}
              </span>
            </div>

            {/* Admin Notes */}
            <div className="form-group">
              <label className="form-label">Admin Verification Notes / Instructions</label>
              <textarea 
                className="form-textarea" 
                rows="2" 
                placeholder="Enter notes on verification decision (e.g. Cleared verified against landmarks)..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button 
                type="button" 
                onClick={() => setSelectedVerify(null)} 
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button 
                type="button" 
                disabled={actionLoading}
                onClick={() => handleVerify('reject')} 
                className="btn btn-danger"
              >
                <X size={16} /> Reject & Reopen
              </button>
              <button 
                type="button" 
                disabled={actionLoading}
                onClick={() => handleVerify('approve')} 
                className="btn btn-success"
              >
                <Check size={16} /> Approve as Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
