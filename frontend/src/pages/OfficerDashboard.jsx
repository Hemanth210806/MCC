import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ComplaintCard from '../components/ComplaintCard';
import api from '../services/api';
import { CheckSquare, Play, Upload, Camera, MapPin, AlertCircle, Clock, Filter } from 'lucide-react';

export default function OfficerDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  // Selected complaint for resolution modal
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [resolvePhoto, setResolvePhoto] = useState(null);
  const [resolvePreview, setResolvePreview] = useState(null);
  const [resolveLat, setResolveLat] = useState(12.2958);
  const [resolveLng, setResolveLng] = useState(76.6394);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [modalMsg, setModalMsg] = useState('');

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      let url = '/officer/complaints?';
      if (filterStatus) url += `status=${filterStatus}&`;
      if (filterPriority) url += `priority=${filterPriority}&`;
      const res = await api.get(url);
      setComplaints(res.data.complaints || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [filterStatus, filterPriority]);

  const handleStartWork = async (complaintId) => {
    try {
      await api.patch(`/officer/complaints/${complaintId}/start`);
      fetchComplaints();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start work');
    }
  };

  const handleOpenResolveModal = (c) => {
    setSelectedComplaint(c);
    setResolveLat(c.latitude + 0.0001); // near original
    setResolveLng(c.longitude + 0.0001);
    setResolvePhoto(null);
    setResolvePreview(null);
    setResolveNotes('');
    setModalMsg('');
  };

  const handleCaptureGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setResolveLat(pos.coords.latitude);
          setResolveLng(pos.coords.longitude);
        },
        () => {
          alert('GPS permission not granted; using current preset pin.');
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolvePhoto) {
      setModalMsg('Resolution proof photograph is required.');
      return;
    }

    setResolving(true);
    const fd = new FormData();
    fd.append('resolution_photo', resolvePhoto);
    fd.append('latitude', resolveLat);
    fd.append('longitude', resolveLng);
    fd.append('notes', resolveNotes);

    try {
      const res = await api.post(`/officer/complaints/${selectedComplaint.id}/resolve`, fd);
      alert(`Resolution submitted! Distance calculated: ${res.data.distance_from_original_m}m. Sent to Admin for verification.`);
      setSelectedComplaint(null);
      fetchComplaints();
    } catch (err) {
      setModalMsg(err.response?.data?.error || 'Submission failed');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="container" style={{ padding: '30px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0d9488' }}>
            DEPARTMENT DISPATCH QUEUE
          </span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
            {user?.department_name || 'Department'} Action Board
          </h2>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <select 
            className="form-select" 
            style={{ width: 'auto', padding: '8px 12px' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="OVERDUE">Overdue</option>
            <option value="VERIFICATION_PENDING">Pending Verification</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <select 
            className="form-select" 
            style={{ width: 'auto', padding: '8px 12px' }}
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading complaints...</div>
      ) : complaints.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          No complaints matching the selected filters.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {complaints.map((c) => (
            <div key={c.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <ComplaintCard complaint={c} />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                {(c.status === 'ASSIGNED' || c.status === 'REOPENED' || c.status === 'OVERDUE') && (
                  <button 
                    onClick={() => handleStartWork(c.id)}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                  >
                    <Play size={15} /> Start Work
                  </button>
                )}
                {(c.status === 'IN_PROGRESS' || c.status === 'OVERDUE') && (
                  <button 
                    onClick={() => handleOpenResolveModal(c)}
                    className="btn btn-success"
                    style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                  >
                    <Camera size={15} /> Submit Resolution
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolution Evidence Modal */}
      {selectedComplaint && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '540px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                Submit Resolution Proof: {selectedComplaint.complaint_code}
              </h3>
              <button 
                onClick={() => setSelectedComplaint(null)} 
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            {modalMsg && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '12px' }}>
                {modalMsg}
              </div>
            )}

            <form onSubmit={handleResolveSubmit}>
              {/* Photo Input */}
              <div className="form-group">
                <label className="form-label">Resolution Work Photo (Required)</label>
                {resolvePreview ? (
                  <div style={{ height: '180px', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px' }}>
                    <img src={resolvePreview} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div 
                    onClick={() => document.getElementById('res-photo-input').click()}
                    style={{ border: '2px dashed #cbd5e1', padding: '24px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#f8fafc' }}
                  >
                    <Upload size={28} style={{ color: '#94a3b8', margin: '0 auto 6px auto' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e3a8a' }}>Upload Completed Work Photo</div>
                  </div>
                )}
                <input 
                  id="res-photo-input" 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      setResolvePhoto(e.target.files[0]);
                      setResolvePreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }} 
                  style={{ display: 'none' }} 
                />
              </div>

              {/* GPS Coordinates */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Resolution Geotag GPS</label>
                  <button type="button" onClick={handleCaptureGPS} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                    📍 Get Current GPS
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input 
                    type="number" 
                    step="any" 
                    className="form-input" 
                    value={resolveLat} 
                    onChange={(e) => setResolveLat(parseFloat(e.target.value))} 
                    placeholder="Latitude" 
                  />
                  <input 
                    type="number" 
                    step="any" 
                    className="form-input" 
                    value={resolveLng} 
                    onChange={(e) => setResolveLng(parseFloat(e.target.value))} 
                    placeholder="Longitude" 
                  />
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                  Original Issue GPS: {selectedComplaint.latitude.toFixed(4)}, {selectedComplaint.longitude.toFixed(4)}
                </div>
              </div>

              {/* Remarks */}
              <div className="form-group">
                <label className="form-label">Officer Remarks</label>
                <textarea 
                  className="form-textarea" 
                  rows="2" 
                  placeholder="e.g. Cleared 2 tons of waste, sanitized area, completed road patch."
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button type="submit" disabled={resolving} className="btn btn-success" style={{ flex: 1, padding: '12px' }}>
                  {resolving ? 'Submitting & Calculating Distance...' : 'Submit to Admin Verification'}
                </button>
                <button type="button" onClick={() => setSelectedComplaint(null)} className="btn btn-outline">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
