import React, { useState, useEffect } from 'react';
import StatusTimeline from '../components/StatusTimeline';
import PriorityBadge from '../components/PriorityBadge';
import api from '../services/api';
import { Search, MapPin, Building, Calendar, Star, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function TrackComplaint() {
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [complaint, setComplaint] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Feedback state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Pre-fill from URL query params if any
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qCode = params.get('code');
    const qPhone = params.get('phone');
    if (qCode) {
      setCode(qCode);
      if (qPhone) setPhone(qPhone);
      fetchComplaint(qCode, qPhone || '');
    }
  }, []);

  const fetchComplaint = async (targetCode, targetPhone) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get(`/complaints/track?code=${encodeURIComponent(targetCode)}&phone=${encodeURIComponent(targetPhone)}`);
      setComplaint(res.data.complaint);
    } catch (err) {
      setComplaint(null);
      setErrorMsg(err.response?.data?.error || 'Could not find complaint. Please check your Complaint ID and mobile number.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!code) {
      setErrorMsg('Please enter your Complaint ID (e.g. MCC-2026-00001)');
      return;
    }
    fetchComplaint(code, phone);
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!complaint) return;
    setFeedbackLoading(true);
    try {
      await api.post(`/complaints/${complaint.id}/feedback`, { rating, comment });
      setFeedbackSuccess(true);
      // refresh complaint
      fetchComplaint(code, phone);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '880px' }}>
      <div style={{ marginBottom: '28px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a' }}>
          Track Complaint Status
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
          Enter your MCC Complaint ID and registered phone number to view live progress.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="card" style={{ marginBottom: '30px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: '2', minWidth: '220px' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Complaint ID (e.g. MCC-2026-00012)" 
            value={code} 
            onChange={(e) => setCode(e.target.value)} 
          />
        </div>
        <div style={{ flex: '1', minWidth: '160px' }}>
          <input 
            type="tel" 
            className="form-input" 
            placeholder="Mobile Number" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
          />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '10px 24px' }}>
          <Search size={16} /> {loading ? 'Checking...' : 'Track'}
        </button>
      </form>

      {errorMsg && (
        <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '14px 18px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Complaint Details Result */}
      {complaint && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>OFFICIAL RECORD</span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e3a8a' }}>
                  {complaint.complaint_code}
                </h3>
                <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 600, marginTop: '2px' }}>
                  {complaint.category_name}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <PriorityBadge priority={complaint.priority} score={complaint.priority_score} reasons={complaint.priority_reasons} showReasons={true} />
                <span className={`badge badge-${complaint.status}`}>{complaint.status.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Stepper Timeline */}
            <StatusTimeline currentStatus={complaint.status} timeline={complaint.timeline || []} />

            {/* Meta Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>WARD</span>
                <strong>{complaint.ward_name} (Ward {complaint.ward_number})</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>DEPARTMENT</span>
                <strong>{complaint.department_name}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>SLA RESOLUTION DUE</span>
                <strong style={{ color: complaint.status === 'OVERDUE' ? '#dc2626' : '#0f172a' }}>
                  {complaint.sla_due_at ? new Date(complaint.sla_due_at).toLocaleString() : 'N/A'}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>AI CONFIDENCE</span>
                <strong>{Math.round((complaint.ai_confidence || 0.8) * 100)}% ({complaint.ai_classification_status})</strong>
              </div>
            </div>

            {complaint.description && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '0.88rem' }}>
                <strong style={{ color: '#475569' }}>Description: </strong>
                {complaint.description}
              </div>
            )}
          </div>

          {/* Side-by-Side Photos (Original vs Resolution) */}
          <div className="card">
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
              Photographic Evidence
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {/* Original Photo */}
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '6px' }}>
                  Original Citizen Report Photo
                </div>
                <div style={{ height: '220px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
                  {complaint.images && complaint.images.length > 0 ? (
                    <img 
                      src={`http://localhost:5000${complaint.images[0].image_path}`} 
                      alt="Original Issue" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=500'; }}
                    />
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No Photo</div>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  Coordinates: {complaint.latitude?.toFixed(4)}, {complaint.longitude?.toFixed(4)}
                </div>
              </div>

              {/* Resolution Photo */}
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#166534', marginBottom: '6px' }}>
                  Field Officer Resolution Evidence
                </div>
                <div style={{ height: '220px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
                  {complaint.resolution_evidence ? (
                    <img 
                      src={`http://localhost:5000${complaint.resolution_evidence.photo_path}`} 
                      alt="Resolution Proof" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1584467735815-f778f274e296?w=500'; }}
                    />
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                      Work is underway. Resolution proof will appear here once submitted by the field officer.
                    </div>
                  )}
                </div>
                {complaint.resolution_evidence && (
                  <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '4px' }}>
                    Distance to Original GPS: <strong>{complaint.resolution_evidence.distance_from_original_m}m</strong> | Verified by Admin
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Feedback Section (if Resolved) */}
          {complaint.status === 'RESOLVED' && (
            <div className="card" style={{ borderLeft: '4px solid #16a34a' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#166534', marginBottom: '10px' }}>
                Citizen Satisfaction Feedback
              </h4>

              {complaint.feedback || feedbackSuccess ? (
                <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#eab308', marginBottom: '6px' }}>
                    {[...Array(complaint.feedback?.rating || rating)].map((_, i) => (
                      <Star key={i} size={18} fill="#eab308" />
                    ))}
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#166534' }}>
                    "{complaint.feedback?.comment || comment || 'Thank you! MCC resolved the issue satisfactorily.'}"
                  </p>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit}>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px' }}>
                    This issue was marked as resolved. Please rate the quality and timeliness of the resolution:
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setRating(val)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: val <= rating ? '#eab308' : '#cbd5e1',
                          cursor: 'pointer'
                        }}
                      >
                        <Star size={28} fill={val <= rating ? '#eab308' : 'none'} />
                      </button>
                    ))}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Feedback Comments</label>
                    <textarea 
                      className="form-textarea" 
                      rows="2" 
                      placeholder="Write your experience..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>

                  <button type="submit" disabled={feedbackLoading} className="btn btn-success">
                    Submit Citizen Rating
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
