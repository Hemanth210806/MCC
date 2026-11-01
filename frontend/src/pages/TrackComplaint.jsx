import React, { useState, useEffect, useMemo } from 'react';
import StatusTimeline from '../components/StatusTimeline';
import PriorityBadge from '../components/PriorityBadge';
import CivicFAQ from '../components/CivicFAQ';
import api from '../services/api';
import { getImageUrl, getCategoryFallback } from '../utils/imageUrl';
import { formatDateTime } from '../utils/exifHelper';
import { 
  Search, 
  MapPin, 
  Building, 
  Calendar, 
  Star, 
  AlertCircle, 
  Clock, 
  Layers, 
  Sparkles,
  Filter,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  FileText,
  Phone
} from 'lucide-react';

export default function TrackComplaint() {
  const language = 'en';
  const labels = {"mcc_title":"Mysuru City Corporation","portal_tag":"Public Grievance Portal","track_by_id":"Track by Complaint ID","search_directory":"Search Directory","tab_heatmap":"Ward Heatmap","track_btn":"Track Complaint","filter_status":"Status","all_statuses":"All statuses","filter_priority":"Priority","all_priorities":"All priorities","filter_ward":"Ward","all_wards":"All wards","reset_filters":"Reset filters","active_session":"Active session","go_to_dashboard":"Go to dashboard","switch_account":"Switch account","staff_portal_title":"Staff Access Portal","staff_portal_desc":"Mysuru City Corporation Official Authentication"};
  const t = (key) => labels[key] || key;
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' | 'directory'

  // Direct ID Tracking state
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
  const [feedbackError, setFeedbackError] = useState('');

  // Search & Filter Directory state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [wardFilter, setWardFilter] = useState('all');
  const [directoryComplaints, setDirectoryComplaints] = useState([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);

  const [allWards, setAllWards] = useState([]);

  useEffect(() => {
    api.get('/public/map-data').then((res) => {
      const wards = res.data?.wards_geojson?.features || [];
      setAllWards(wards
        .map((feature) => feature.properties)
        .filter((ward) => ward?.ward_number)
        .sort((a, b) => Number(a.ward_number) - Number(b.ward_number)));
    }).catch(() => setAllWards([]));
  }, []);

  // Pre-fill from URL query params if any
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qCode = params.get('code');
    const qPhone = params.get('phone');
    const qTab = params.get('tab');
    if (qCode) {
      setCode(qCode);
      if (qPhone) setPhone(qPhone);
      fetchComplaint(qCode, qPhone || '');
    } else if (qTab === 'directory') {
      setActiveTab('directory');
    }
  }, []);

  // Prefetch the directory so filters are ready immediately.
  useEffect(() => {
    fetchDirectoryComplaints();
  }, [searchQuery, statusFilter, priorityFilter, wardFilter]);

  const fetchComplaint = async (targetCode, targetPhone) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get(`/complaints/track?code=${encodeURIComponent(targetCode)}&phone=${encodeURIComponent(targetPhone)}`);
      setComplaint(res.data.complaint);
      setActiveTab('direct');
    } catch (err) {
      setComplaint(null);
      setErrorMsg(err.response?.data?.error || (language === 'kn' ? 'ದೂರು ಕಂಡುಬಂದಿಲ್ಲ. ದಯವಿಟ್ಟು ದೂರು ಐಡಿ ಪರಿಶೀಲಿಸಿ.' : 'Could not find complaint. Please check your Complaint ID and mobile number.'));
    } finally {
      setLoading(false);
    }
  };

  const fetchDirectoryComplaints = async () => {
    setDirectoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('query', searchQuery.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (wardFilter !== 'all') params.append('ward', wardFilter);

      const res = await api.get(`/complaints/search?${params.toString()}`);
      setDirectoryComplaints(res.data.complaints || []);
    } catch (err) {
      console.warn('Failed to search complaints:', err);
      setDirectoryComplaints([]);
    } finally {
      setDirectoryLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!code) {
      setErrorMsg(language === 'kn' ? 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ದೂರು ಐಡಿ ನಮೂದಿಸಿ (ಉದಾ: MCC-2026-00001)' : 'Please enter your Complaint ID (e.g. MCC-2026-00001)');
      return;
    }
    fetchComplaint(code, phone);
  };

  const handleSelectFromDirectory = (c) => {
    setComplaint(c);
    setCode(c.complaint_code);
    setActiveTab('direct');
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setWardFilter('all');
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!complaint) return;
    setFeedbackLoading(true);
    setFeedbackError('');
    try {
      await api.post(`/complaints/${complaint.id}/feedback`, { rating, comment });
      setFeedbackSuccess(true);
      fetchComplaint(code, phone);
    } catch (err) {
      setFeedbackError(err.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#fbf7ee', minHeight: '100vh', padding: '40px 0', color: '#1f241a' }}>
      <div className="container" style={{ maxWidth: '1080px' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#edf4e4',
            border: '1.5px solid #4b5e28',
            color: '#4b5e28',
            padding: '5px 16px',
            borderRadius: '9999px',
            fontSize: '0.82rem',
            fontWeight: 800,
            marginBottom: '12px'
          }}>
            <Sparkles size={14} color="#4b5e28" /> {t('mcc_title')} • {t('portal_tag')}
          </div>
          <h2 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#1f241a', letterSpacing: '-0.02em' }}>
            {language === 'kn' ? 'ನಾಗರಿಕ ದೂರುಗಳ ಸ್ಥಿತಿ ಮತ್ತು ವಾರ್ಡ್ ಸಾಂದ್ರತೆ' : 'Track Civic Issues & Grievance Directory'}
          </h2>
          <p style={{ color: '#5e6654', fontSize: '0.98rem', maxWidth: '720px', margin: '8px auto 0 auto', lineHeight: 1.6 }}>
            {language === 'kn' 
              ? 'ನಿಮ್ಮ ದೂರಿನ ಲೈವ್ ಸ್ಥಿತಿಯನ್ನು ವೀಕ್ಷಿಸಿ, ೬೫ ವಾರ್ಡ್‌ಗಳ ಡೈರೆಕ್ಟರಿ ಶೋಧಿಸಿ ಅಥವಾ ಕ್ರಿಟಿಕಲ್ ವಾರ್ಡ್‌ಗಳನ್ನು ಹೀಟ್‌ಮ್ಯಾಪ್‌ನಲ್ಲಿ ಗುರುತಿಸಿ.' 
              : 'Track the live status of your specific complaint, search civic issues across all 65 Mysuru municipal wards, or identify critical areas with the interactive ward density heat map.'}
          </p>
        </div>

        {/* Segmented Triple Mode Switcher with Olive Green Accents */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '32px'
        }}>
          <div style={{
            display: 'inline-flex',
            backgroundColor: '#fbf7ee',
            border: '1.5px solid #e5dcbe',
            padding: '5px',
            borderRadius: '14px',
            gap: '6px',
            flexWrap: 'wrap',
            boxShadow: '0 2px 8px rgba(75, 94, 40, 0.08)'
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('direct')}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 700,
                backgroundColor: activeTab === 'direct' ? '#4b5e28' : 'transparent',
                color: activeTab === 'direct' ? '#ffffff' : '#4a5240',
                border: activeTab === 'direct' ? '1.5px solid #3c4c1f' : '1px solid transparent',
                boxShadow: activeTab === 'direct' ? '0 2px 8px rgba(75, 94, 40, 0.35)' : 'none',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <Search size={16} /> {t('track_by_id')}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('directory')}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 700,
                backgroundColor: activeTab === 'directory' ? '#4b5e28' : 'transparent',
                color: activeTab === 'directory' ? '#ffffff' : '#4a5240',
                border: activeTab === 'directory' ? '1.5px solid #3c4c1f' : '1px solid transparent',
                boxShadow: activeTab === 'directory' ? '0 2px 8px rgba(75, 94, 40, 0.35)' : 'none',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <Filter size={16} /> {t('search_directory')}
            </button>

          </div>
        </div>

        {/* ============================================================== */}
        {/* MODE 1: Direct ID Tracking */}
        {/* ============================================================== */}
        {activeTab === 'direct' && (
          <div style={{ marginBottom: '40px' }}>
            {/* Direct Search Form in Royal Light Gold & Olive Button */}
            <form onSubmit={handleSearch} className="card" style={{ marginBottom: '28px', display: 'flex', gap: '14px', flexWrap: 'wrap', backgroundColor: '#ffffff', borderColor: '#e5dcbe', boxShadow: '0 2px 8px rgba(75, 94, 40, 0.05)' }}>
              <div style={{ flex: '2', minWidth: '220px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={language === 'kn' ? 'ದೂರು ಐಡಿ (ಉದಾ: MCC-2026-00012)' : 'Complaint ID (e.g. MCC-2026-00012)'} 
                  value={code} 
                  onChange={(e) => setCode(e.target.value)} 
                />
              </div>
              <div style={{ flex: '1', minWidth: '160px' }}>
                <input 
                  type="tel" 
                  className="form-input" 
                  placeholder={language === 'kn' ? 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ (ಐಚ್ಛಿಕ)' : 'Mobile Number (Optional)'} 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                />
              </div>
              <button type="submit" disabled={loading} className="btn btn-olive" style={{ padding: '10px 24px', fontWeight: 700, backgroundColor: '#4b5e28', color: '#ffffff' }}>
                <Search size={16} /> {loading ? (language === 'kn' ? 'ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...' : 'Checking...') : t('track_btn')}
              </button>
            </form>

            {errorMsg && (
              <div style={{ backgroundColor: '#fef2f2', border: '1.5px solid #fca5a5', color: '#b91c1c', padding: '14px 18px', borderRadius: '10px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={20} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Complaint Details Result */}
            {complaint && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="card" style={{ backgroundColor: '#ffffff', borderColor: '#e5dcbe', boxShadow: '0 2px 8px rgba(75, 94, 40, 0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1.5px solid #e8dfc9', paddingBottom: '16px' }}>
                    <div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#b38328', letterSpacing: '0.05em' }}>
                        {language === 'kn' ? 'ಅಧಿಕೃತ ದೂರು ದಾಖಲೆ' : 'OFFICIAL RECORD'}
                      </span>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f241a', marginTop: '2px' }}>
                        {complaint.complaint_code}
                      </h3>
                      <div style={{ fontSize: '0.96rem', color: '#4b5e28', fontWeight: 700, marginTop: '2px' }}>
                        {complaint.category_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#5e6654', marginTop: '4px' }}>
                        {language === 'kn' ? 'ಸಲ್ಲಿಸಿದ ದಿನಾಂಕ' : 'Reported'}: <strong style={{ color: '#1f241a' }}>{formatDateTime(complaint.created_at)}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <PriorityBadge priority={complaint.priority} score={complaint.priority_score} reasons={complaint.priority_reasons} showReasons={true} />
                      <span className={`badge badge-${complaint.status}`}>{complaint.status.replace('_', ' ')}</span>
                    </div>
                  </div>

                  {/* Stepper Timeline */}
                  <StatusTimeline currentStatus={complaint.status} timeline={complaint.history || complaint.timeline || []} />

                  {/* Meta Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', borderTop: '1.5px solid #e8dfc9', paddingTop: '18px', fontSize: '0.85rem' }}>
                    <div style={{ backgroundColor: '#fcfaf4', padding: '12px', borderRadius: '8px', border: '1px solid #e8dfc9' }}>
                      <span style={{ color: '#5e6654', display: 'block', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 800 }}>
                        {language === 'kn' ? 'ವಾರ್ಡ್' : 'WARD'}
                      </span>
                      <strong style={{ color: '#1f241a' }}>{complaint.ward_name} (Ward {complaint.ward_number})</strong>
                    </div>
                    <div style={{ backgroundColor: '#fcfaf4', padding: '12px', borderRadius: '8px', border: '1px solid #e8dfc9' }}>
                      <span style={{ color: '#5e6654', display: 'block', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 800 }}>
                        {language === 'kn' ? 'ಇಲಾಖೆ' : 'DEPARTMENT'}
                      </span>
                      <strong style={{ color: '#1f241a' }}>{complaint.department_name}</strong>
                    </div>
                    <div style={{ backgroundColor: '#fcfaf4', padding: '12px', borderRadius: '8px', border: '1px solid #e8dfc9' }}>
                      <span style={{ color: '#5e6654', display: 'block', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 800 }}>
                        {language === 'kn' ? 'ಎಸ್.ಎಲ್.ಎ ಕಾಲಮಿತಿ' : 'SLA RESOLUTION DUE'}
                      </span>
                      <strong style={{ color: complaint.status === 'OVERDUE' ? '#b91c1c' : '#b38328' }}>
                        {formatDateTime(complaint.sla_due_at)}
                      </strong>
                    </div>
                    <div style={{ backgroundColor: '#fcfaf4', padding: '12px', borderRadius: '8px', border: '1px solid #e8dfc9' }}>
                      <span style={{ color: '#5e6654', display: 'block', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 800 }}>
                        {language === 'kn' ? 'ಜಿಪಿಎಸ್ ನಿಖರತೆ' : 'GPS ACCURACY'}
                      </span>
                      <strong style={{ color: '#4b5e28' }}>{complaint.gps_accuracy_m ? `±${complaint.gps_accuracy_m}m` : 'Verified GPS'}</strong>
                    </div>
                  </div>

                  {complaint.description && (
                    <div style={{ marginTop: '18px', padding: '14px', backgroundColor: '#fcfaf4', borderRadius: '8px', fontSize: '0.88rem', border: '1px solid #e8dfc9' }}>
                      <strong style={{ color: '#b38328' }}>{language === 'kn' ? 'ನಾಗರಿಕರ ವಿವರಣೆ' : 'Citizen Description'}: </strong>
                      <span style={{ color: '#4a5040' }}>{complaint.description}</span>
                    </div>
                  )}

                  {complaint.assigned_worker_name && (
                    <div style={{
                      marginTop: '18px',
                      padding: '14px 16px',
                      backgroundColor: '#edf4e4',
                      border: '1.5px solid #b8c9a3',
                      borderRadius: '9px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      flexWrap: 'wrap'
                    }}>
                      <div>
                        <div style={{
                          color: '#4b5e28',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          marginBottom: '4px'
                        }}>
                          {language === 'kn' ? 'ನಿಯೋಜಿಸಲಾದ ಸಿಬ್ಬಂದಿ' : 'ASSIGNED WORKER'}
                        </div>
                        <strong style={{ color: '#1f241a', fontSize: '1rem' }}>
                          {complaint.assigned_worker_name}
                        </strong>
                        <div style={{ color: '#5e6654', fontSize: '0.82rem', marginTop: '3px' }}>
                          {complaint.ward_name} • {complaint.department_name}
                        </div>
                      </div>
                      {complaint.assigned_worker_phone && (
                        <a
                          href={`tel:${complaint.assigned_worker_phone}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#4b5e28',
                            fontWeight: 800,
                            textDecoration: 'none',
                            padding: '8px 12px',
                            border: '1px solid #8da86a',
                            borderRadius: '7px',
                            backgroundColor: '#ffffff'
                          }}
                        >
                          <Phone size={15} /> {complaint.assigned_worker_phone}
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Photographic Evidence */}
                <div className="card" style={{ backgroundColor: '#ffffff', borderColor: '#e5dcbe', boxShadow: '0 2px 8px rgba(75, 94, 40, 0.06)' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1f241a', marginBottom: '16px' }}>
                    {language === 'kn' ? 'ಛಾಯಾಚಿತ್ರ ಪುರಾವೆ ಮತ್ತು ಜಿಯೋಟ್ಯಾಗ್ ಪರಿಶೀಲನೆ' : 'Photographic Evidence & Geotag Verification'}
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    {/* Original Photo */}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#5e6654', marginBottom: '8px' }}>
                        {language === 'kn' ? 'ನಾಗರಿಕರು ಸಲ್ಲಿಸಿದ ಮೂಲ ಫೋಟೋ' : 'Original Citizen Report Photo'}
                      </div>
                      <div style={{ height: '220px', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#f5efe1', border: '1.5px solid #e5dcbe' }}>
                        {complaint.images && complaint.images.length > 0 ? (
                          <img 
                            src={getImageUrl(complaint.images[0].image_path, complaint.category_name, false)} 
                            alt="Original Issue" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { 
                              const fb = getCategoryFallback(complaint.category_name, false);
                              if (e.target.src !== fb) e.target.src = fb;
                            }}
                          />
                        ) : (
                          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5e6654' }}>No Photo</div>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#5e6654', marginTop: '6px' }}>
                        GPS: {complaint.latitude?.toFixed(4)}, {complaint.longitude?.toFixed(4)}
                      </div>
                    </div>

                    {/* Resolution Photo */}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#4b5e28', marginBottom: '8px' }}>
                        {language === 'kn' ? 'ಕ್ಷೇತ್ರ ಅಧಿಕಾರಿಯ ಪರಿಹಾರ ಪುರಾವೆ' : 'Field Officer Resolution Evidence'}
                      </div>
                      <div style={{ height: '220px', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#f5efe1', border: '1.5px solid #e5dcbe' }}>
                        {complaint.resolution_evidence ? (
                          <img 
                            src={getImageUrl(complaint.resolution_evidence.photo_path, complaint.category_name, true)} 
                            alt="Resolution Proof" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { 
                              const fb = getCategoryFallback(complaint.category_name, true);
                              if (e.target.src !== fb) e.target.src = fb;
                            }}
                          />
                        ) : (
                          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5e6654', textAlign: 'center', padding: '24px', lineHeight: 1.5 }}>
                            {language === 'kn' 
                              ? 'ಕಾಮಗಾರಿ ಪ್ರಗತಿಯಲ್ಲಿದೆ. ಕ್ಷೇತ್ರ ಅಧಿಕಾರಿ ಪರಿಹಾರ ಪುರಾವೆಯನ್ನು ಸಲ್ಲಿಸಿದ ನಂತರ ಇಲ್ಲಿ ಪ್ರದರ್ಶಿಸಲಾಗುತ್ತದೆ.' 
                              : 'Work is currently in progress. Field officer resolution proof will appear here once submitted and verified.'}
                          </div>
                        )}
                      </div>
                      {complaint.resolution_evidence && (
                        <div style={{ fontSize: '0.75rem', color: '#4b5e28', fontWeight: 600, marginTop: '6px' }}>
                          Distance to Original GPS: <strong>{complaint.resolution_evidence.distance_from_original_m}m</strong> | Verified by Admin
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Feedback Section (if Resolved) */}
                {complaint.status === 'RESOLVED' && (
                  <div className="card" style={{ borderLeft: '4px solid #4b5e28', backgroundColor: '#ffffff', borderColor: '#e5dcbe' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4b5e28', marginBottom: '10px' }}>
                      {language === 'kn' ? 'ನಾಗರಿಕರ ಸಂತೃಪ್ತಿ ರೇಟಿಂಗ್' : 'Citizen Satisfaction Feedback'}
                    </h4>

                    {complaint.feedback || feedbackSuccess ? (
                      <div style={{ backgroundColor: '#edf7e7', border: '1px solid #b8df9c', padding: '16px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b38328', marginBottom: '6px' }}>
                          {[...Array(complaint.feedback?.rating || rating)].map((_, i) => (
                            <Star key={i} size={18} fill="#b38328" color="#b38328" />
                          ))}
                        </div>
                        <p style={{ fontSize: '0.88rem', color: '#36651e', margin: 0, fontWeight: 600 }}>
                          "{complaint.feedback?.comment || comment || 'Thank you! MCC resolved the issue satisfactorily.'}"
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleFeedbackSubmit}>
                        <p style={{ fontSize: '0.85rem', color: '#5e6654', marginBottom: '12px' }}>
                          {language === 'kn' 
                            ? 'ಈ ದೂರು ಪರಿಹಾರವಾಗಿದೆ. ದಯವಿಟ್ಟು ಕಾರ್ಯದ ಗುಣಮಟ್ಟ ಮತ್ತು ಸಮಯಪಾಲನೆಗೆ ರೇಟಿಂಗ್ ನೀಡಿ:' 
                            : 'This issue was marked as resolved. Please rate the quality and timeliness of the resolution:'}
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
                                color: val <= rating ? '#b38328' : '#dcd3b8',
                                cursor: 'pointer'
                              }}
                            >
                              <Star size={28} fill={val <= rating ? '#b38328' : 'none'} />
                            </button>
                          ))}
                        </div>

                        <div className="form-group">
                          <label className="form-label">{language === 'kn' ? 'ಪ್ರತಿಕ್ರಿಯೆ ಅನಿಸಿಕೆ' : 'Feedback Comments'}</label>
                          <textarea 
                            className="form-textarea" 
                            rows="2" 
                            placeholder={language === 'kn' ? 'ನಿಮ್ಮ ಅನುಭವವನ್ನು ಹಂಚಿಕೊಳ್ಳಿ...' : 'Write your experience...'}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                          />
                        </div>

                        <button type="submit" disabled={feedbackLoading} className="btn btn-olive" style={{ backgroundColor: '#4b5e28', color: '#ffffff' }}>
                          {language === 'kn' ? 'ರೇಟಿಂಗ್ ಸಲ್ಲಿಸಿ' : 'Submit Citizen Rating'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* MODE 2: Searchable & Filterable Complaints Directory */}
        {/* ============================================================== */}
        {activeTab === 'directory' && (
          <div style={{ marginBottom: '40px' }}>
            {/* Multi-Criteria Filter Controls Card */}
            <div className="card" style={{ marginBottom: '24px', backgroundColor: '#ffffff', borderColor: '#e5dcbe', boxShadow: '0 2px 8px rgba(75, 94, 40, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#4b5e28', fontWeight: 800, fontSize: '0.98rem' }}>
                <SlidersHorizontal size={18} />
                <span>{language === 'kn' ? 'ಬಹು-ಮಾನದಂಡ ದೂರುಗಳ ಶೋಧಕ' : 'Multi-Criteria Complaint Filter'}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                {/* Text Search Input */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', color: '#5e6654' }}>
                    {language === 'kn' ? 'ಕೀವರ್ಡ್, ದೂರು ಕೋಡ್ ಅಥವಾ ವಾರ್ಡ್ ಹೆಸರು ಮೂಲಕ ಹುಡುಕಿ' : 'Search by Keyword, Complaint Code, or Ward Name'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#7e8774' }} />
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '36px' }}
                      placeholder={language === 'kn' ? "ಉದಾಹರಣೆಗೆ: 'MCC-2026-00014', 'pothole', 'Agrahara', 'Kuvempunagar'..." : "Search e.g. 'MCC-2026-00014', 'pothole', 'Agrahara', 'J P Nagar'..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Status Filter Dropdown */}
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', color: '#5e6654' }}>{t('filter_status')}</label>
                  <select
                    className="form-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">{t('all_statuses')}</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="VERIFICATION_PENDING">Verification Pending</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="OVERDUE">Overdue (SLA Breached)</option>
                  </select>
                </div>

                {/* Priority Filter Dropdown */}
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', color: '#5e6654' }}>{t('filter_priority')}</label>
                  <select
                    className="form-select"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                  >
                    <option value="all">{t('all_priorities')}</option>
                    <option value="HIGH">{language === 'kn' ? 'ಹೆಚ್ಚಿನ ಆದ್ಯತೆ (೨೪ ಗಂಟೆ ಎಸ್.ಎಲ್.ಎ)' : 'High Priority (24h SLA)'}</option>
                    <option value="MEDIUM">{language === 'kn' ? 'ಮಧ್ಯಮ ಆದ್ಯತೆ (೭೨ ಗಂಟೆ ಎಸ್.ಎಲ್.ಎ)' : 'Medium Priority (72h SLA)'}</option>
                    <option value="LOW">{language === 'kn' ? 'ಕಡಿಮೆ ಆದ್ಯತೆ (೧೬೮ ಗಂಟೆ ಎಸ್.ಎಲ್.ಎ)' : 'Low Priority (168h SLA)'}</option>
                  </select>
                </div>

                {/* Ward Filter Dropdown */}
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', color: '#5e6654' }}>{t('filter_ward')}</label>
                  <select
                    className="form-select"
                    value={wardFilter}
                    onChange={(e) => setWardFilter(e.target.value)}
                  >
                    <option value="all">{t('all_wards')}</option>
                    {allWards.map((w) => (
                      <option key={w.ward_number} value={w.ward_number}>
                        Ward {w.ward_number} - {w.ward_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Filter Summary & Reset Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: '1.5px solid #e8dfc9',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ fontSize: '0.82rem', color: '#5e6654', fontWeight: 600 }}>
                  {language === 'kn' ? 'ಪ್ರಸ್ತುತ ಫಿಲ್ಟರ್‌ಗಳಿಗೆ ಹೊಂದಿಕೆಯಾಗುವ ದೂರುಗಳು:' : 'Showing'} <strong style={{ color: '#4b5e28' }}>{directoryComplaints.length}</strong> {language === 'kn' ? '' : 'complaints matching current filters'}
                </div>

                {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || wardFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="btn btn-outline"
                    style={{ padding: '6px 14px', fontSize: '0.78rem', color: '#3c4c1f', borderColor: '#4b5e28' }}
                  >
                    <RefreshCw size={13} /> {t('reset_filters')}
                  </button>
                )}
              </div>
            </div>

            {/* Directory Complaint Cards Grid */}
            {directoryLoading ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#5e6654', backgroundColor: '#ffffff', borderColor: '#e5dcbe' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto', color: '#4b5e28' }} />
                <div>{language === 'kn' ? 'ದೂರುಗಳ ಡೈರೆಕ್ಟರಿ ಲೋಡ್ ಆಗುತ್ತಿದೆ...' : 'Loading complaints directory...'}</div>
              </div>
            ) : directoryComplaints.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#5e6654', backgroundColor: '#ffffff', borderColor: '#e5dcbe' }}>
                <AlertCircle size={32} style={{ color: '#b38328', margin: '0 auto 10px auto' }} />
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1f241a' }}>
                  {language === 'kn' ? 'ಯಾವುದೇ ದೂರುಗಳು ಕಂಡುಬಂದಿಲ್ಲ' : 'No complaints found'}
                </div>
                <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                  {language === 'kn' ? 'ದಯವಿಟ್ಟು ಹುಡುಕಾಟದ ಕೀವರ್ಡ್ ಅಥವಾ ಫಿಲ್ಟರ್‌ಗಳನ್ನು ಬದಲಾಯಿಸಿ.' : 'Try adjusting your search keyword or clearing the status, priority, or ward filters.'}
                </div>
                <button 
                  onClick={handleResetFilters} 
                  className="btn btn-outline" 
                  style={{ marginTop: '16px', padding: '8px 16px', fontSize: '0.82rem', borderColor: '#4b5e28', color: '#3c4c1f' }}
                >
                  {t('reset_filters')}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {directoryComplaints.map((c) => (
                  <div 
                    key={c.id} 
                    className="card"
                    style={{
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      flexWrap: 'wrap',
                      backgroundColor: '#ffffff',
                      borderColor: '#e5dcbe',
                      boxShadow: '0 2px 8px rgba(75, 94, 40, 0.05)',
                      borderLeft: c.status === 'OVERDUE' 
                        ? '4px solid #b91c1c' 
                        : (c.status === 'RESOLVED' ? '4px solid #4b5e28' : '4px solid #b38328')
                    }}
                  >
                    {/* Left info */}
                    <div style={{ flex: '1', minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 800, color: '#b38328', fontSize: '1rem' }}>
                          {c.complaint_code}
                        </span>
                        <PriorityBadge priority={c.priority} score={c.priority_score} reasons={c.priority_reasons} />
                        <span className={`badge badge-${c.status}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#1f241a' }}>
                        {c.category_name}
                      </div>

                      <p style={{
                        fontSize: '0.82rem',
                        color: '#4a5040',
                        margin: '4px 0',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {c.description || (language === 'kn' ? 'ಮೈಸೂರು ಮಹಾನಗರ ಪಾಲಿಕೆ ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ದೂರು ದಾಖಲಾಗಿದೆ.' : 'Civic report logged in municipal ward.')}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.78rem', color: '#5e6654', marginTop: '6px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4b5e28', fontWeight: 700 }}>
                          <MapPin size={13} /> Ward {c.ward_number} - {c.ward_name}
                        </span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Building size={13} /> {c.department_name}
                        </span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} /> {formatDateTime(c.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Right Action Button with Olive Green Touch */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <div style={{ fontSize: '0.74rem', color: c.status === 'OVERDUE' ? '#b91c1c' : '#5e6654', fontWeight: 700 }}>
                        SLA: {formatDateTime(c.sla_due_at)}
                      </div>
                      <button
                        onClick={() => handleSelectFromDirectory(c)}
                        className="btn btn-olive"
                        style={{
                          padding: '8px 16px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: '#ffffff',
                          backgroundColor: '#4b5e28'
                        }}
                      >
                        <Eye size={15} /> {language === 'kn' ? 'ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸಿ' : 'Track Timeline'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* Frequently Asked Questions (FAQ) Component */}
        {/* ============================================================== */}
        <CivicFAQ />
      </div>
    </div>
  );
}
