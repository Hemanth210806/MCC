import React, { useState, useEffect } from 'react';
import MapView from '../components/MapView';
import api from '../services/api';
import { Camera, MapPin, Upload, AlertCircle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';

export default function FileComplaint({ setActivePage }) {
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [latitude, setLatitude] = useState(12.2958);
  const [longitude, setLongitude] = useState(76.6394);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [locating, setLocating] = useState(false);
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [citizenEmail, setCitizenEmail] = useState('');
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  // Wards GeoJSON for map display
  const [wardGeoJson, setWardGeoJson] = useState(null);

  useEffect(() => {
    const fetchWards = async () => {
      try {
        const res = await api.get('/public/map-data');
        if (res.data?.wards_geojson) {
          setWardGeoJson(res.data.wards_geojson);
        }
      } catch (err) {}
    };
    fetchWards();
  }, []);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setErrorMsg('');
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser. Please drag the pin on the map.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setLocating(false);
        setErrorMsg('');
      },
      (err) => {
        setLocating(false);
        setErrorMsg('Location permission denied or unavailable. You can click on the map to pin your location.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleMapClick = (lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photo) {
      setErrorMsg('Please upload or take a photograph of the civic problem.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('photo', photo);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    if (gpsAccuracy) formData.append('gps_accuracy_m', gpsAccuracy);
    if (citizenName) formData.append('citizen_name', citizenName);
    if (citizenPhone) formData.append('citizen_phone', citizenPhone);
    if (citizenEmail) formData.append('citizen_email', citizenEmail);
    if (description) formData.append('description', description);

    try {
      const res = await api.post('/complaints', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccessResult(res.data);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Submission failed. Please check inputs and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (successResult) {
    return (
      <div className="container" style={{ padding: '60px 20px', maxWidth: '680px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px 30px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#166534' }}>
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
            Complaint Successfully Registered!
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '6px' }}>
            Your civic report has been classified, prioritized, and dispatched to MCC.
          </p>

          {/* Reference Card */}
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', margin: '24px 0', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Complaint ID:</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e3a8a' }}>{successResult.complaint_code}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Assigned Ward:</span>
              <span style={{ fontWeight: 700 }}>{successResult.ward_name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>AI Classification:</span>
              <span style={{ fontWeight: 700 }}>{successResult.category_name} ({Math.round(successResult.ai_confidence * 100)}% conf)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Department:</span>
              <span style={{ fontWeight: 700 }}>{successResult.department_name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Priority:</span>
              <span className={`badge badge-priority-${successResult.priority}`}>{successResult.priority}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>SLA Target:</span>
              <span style={{ fontWeight: 700, color: '#b45309' }}>{new Date(successResult.sla_due_at).toLocaleString()}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button 
              onClick={() => setActivePage('track')}
              className="btn btn-primary"
              style={{ padding: '12px 24px' }}
            >
              Track Complaint Status <ArrowRight size={16} />
            </button>
            <button 
              onClick={() => {
                setSuccessResult(null);
                setPhoto(null);
                setPhotoPreview(null);
                setDescription('');
              }}
              className="btn btn-outline"
              style={{ padding: '12px 24px' }}
            >
              File Another Issue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '1000px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a' }}>
          Report a Civic Issue
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
          Upload a photo and share your GPS location. No mandatory registration required.
        </p>
      </div>

      {errorMsg && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #fca5a5',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        {/* Left Column: Photo and Location Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Photo Upload Box */}
          <div className="card">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Camera size={18} style={{ color: '#1e3a8a' }} /> Issue Photograph (Required)
            </label>

            {photoPreview ? (
              <div style={{ position: 'relative', height: '220px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#0f172a' }}>
                <img 
                  src={photoPreview} 
                  alt="Issue Preview" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                <button
                  type="button"
                  onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.75rem'
                  }}
                >
                  Change Photo
                </button>
              </div>
            ) : (
              <div style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '30px 20px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                cursor: 'pointer'
              }} onClick={() => document.getElementById('photo-input').click()}>
                <Upload size={36} style={{ color: '#94a3b8', margin: '0 auto 10px auto' }} />
                <div style={{ fontWeight: 600, color: '#1e3a8a', fontSize: '0.95rem' }}>
                  Click to take or upload a photo
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  JPG, PNG, or WEBP up to 5MB
                </div>
              </div>
            )}
            <input 
              id="photo-input"
              type="file" 
              accept="image/*" 
              capture="environment"
              onChange={handlePhotoChange} 
              style={{ display: 'none' }} 
            />
          </div>

          {/* Citizen Details */}
          <div className="card">
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
              Description & Contact Details (Optional)
            </h4>

            <div className="form-group">
              <label className="form-label">Brief Description</label>
              <textarea 
                className="form-textarea"
                rows="3"
                placeholder="e.g. Broken streetlight near Kuvempunagar complex bus stop..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <input 
                  type="tel"
                  className="form-input"
                  placeholder="10-digit mobile"
                  value={citizenPhone}
                  onChange={(e) => setCitizenPhone(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="Optional"
                  value={citizenName}
                  onChange={(e) => setCitizenName(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-gold"
              style={{ width: '100%', padding: '14px', fontSize: '1.05rem', marginTop: '10px' }}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Classifying & Submitting...
                </>
              ) : (
                'Submit Civic Complaint'
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Location Picker */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={18} style={{ color: '#1e3a8a' }} /> Issue Location & Ward Preview
            </label>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={locating}
              className="btn btn-primary"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              {locating ? 'Capturing GPS...' : '📍 Use My Current Location'}
            </button>
          </div>

          <div style={{ flex: 1, minHeight: '340px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <MapView 
              height="100%"
              center={[latitude, longitude]}
              zoom={14}
              wardGeoJson={wardGeoJson}
              draggableMarker={{ lat: latitude, lng: longitude }}
              onMarkerDragEnd={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
              onMapClick={handleMapClick}
            />
          </div>

          <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
            <span>Lat: <strong>{latitude.toFixed(5)}</strong>, Lng: <strong>{longitude.toFixed(5)}</strong></span>
            {gpsAccuracy && <span>GPS Accuracy: ±{gpsAccuracy}m</span>}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
            Tip: Drag the pin or click on the map to set the exact spot.
          </div>
        </div>
      </form>
    </div>
  );
}
