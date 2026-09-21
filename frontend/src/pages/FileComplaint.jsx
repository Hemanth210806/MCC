import React, { useState, useEffect } from 'react';
import MapView from '../components/MapView';
import api from '../services/api';
import { Camera, MapPin, Upload, AlertCircle, CheckCircle2, ArrowRight, Loader2, Sparkles, ShieldAlert, Layers } from 'lucide-react';
import { extractExifGps, stampGeotagOnImage, formatDateTime } from '../utils/exifHelper';

export default function FileComplaint({ setActivePage }) {
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [latitude, setLatitude] = useState(12.2958);
  const [longitude, setLongitude] = useState(76.6394);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationMode, setLocationMode] = useState('current');
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [citizenEmail, setCitizenEmail] = useState('');
  const [description, setDescription] = useState('');

  // Geotag & Ward state
  const [wardInfo, setWardInfo] = useState(null);
  const [isOutsideMcc, setIsOutsideMcc] = useState(false);
  const [exifBadge, setExifBadge] = useState(null);
  const [isStamping, setIsStamping] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  // Wards GeoJSON for map display
  const [wardGeoJson, setWardGeoJson] = useState(null);

  const isManualLocationRef = React.useRef(false);

  const fetchWardForPoint = async (lat, lng) => {
    try {
      const res = await api.get(`/public/wards/lookup?lat=${lat}&lng=${lng}`);
      if (res.data) {
        setWardInfo(res.data);
        setIsOutsideMcc(Boolean(res.data.outside_mcc_boundary));
      }
    } catch (e) {
      console.warn('Ward lookup failed:', e);
    }
  };

  const handleManualLocationChange = (lat, lng) => {
    isManualLocationRef.current = true;
    setLatitude(lat);
    setLongitude(lng);
    setLocationMode('manual');
    setGpsAccuracy(null);
    setExifBadge({
      type: 'manual',
      text: `📍 Location Pinned: Lat ${lat.toFixed(5)}°, Lng ${lng.toFixed(5)}° (Custom Map Pin)`
    });
    fetchWardForPoint(lat, lng);
  };

  const requestCurrentLocation = (silent = false) => {
    if (!navigator.geolocation) {
      if (!silent) {
        setErrorMsg('Geolocation is not supported by your browser. Please drag the pin on the map.');
      }
      return;
    }

    if (!silent) {
      isManualLocationRef.current = false;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // If this was a silent background call and user has already manually chosen a location, do not override
        if (silent && isManualLocationRef.current) {
          setLocating(false);
          return;
        }

        const nextLat = pos.coords.latitude;
        const nextLng = pos.coords.longitude;
        setLatitude(nextLat);
        setLongitude(nextLng);
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setLocationMode('current');
        setLocating(false);
        setErrorMsg('');
        fetchWardForPoint(nextLat, nextLng);
      },
      (err) => {
        setLocating(false);
        if (!silent) {
          setErrorMsg('Location permission denied or unavailable. You can click on the map to pin your location.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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
    requestCurrentLocation(true);
  }, []);

  // Check ward boundary whenever coordinates change
  useEffect(() => {
    if (latitude && longitude) {
      fetchWardForPoint(latitude, longitude);
    }
  }, [latitude, longitude]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting the same file triggers onChange
    e.target.value = '';

    setErrorMsg('');
    // Instant preview so user immediately sees their photo was accepted
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setIsStamping(true);

    try {
      // 1. Try reading EXIF GPS from the uploaded photo
      const exif = await extractExifGps(file);
      let targetLat = latitude;
      let targetLng = longitude;
      let detectedTime = null;

      // Only auto-extract EXIF GPS if user hasn't explicitly set a custom map pin
      if (exif && exif.latitude && exif.longitude && !isManualLocationRef.current) {
        targetLat = exif.latitude;
        targetLng = exif.longitude;
        detectedTime = exif.timestamp;
        setLatitude(targetLat);
        setLongitude(targetLng);
        setLocationMode('exif');
        setExifBadge({
          type: 'exif',
          text: `🟢 Camera GPS Auto-Extracted: Lat ${targetLat.toFixed(5)}°, Lng ${targetLng.toFixed(5)}° (Pinned to Ward)`
        });
      } else {
        // Respect the user's selected/dragged location!
        targetLat = latitude;
        targetLng = longitude;
        setExifBadge({
          type: isManualLocationRef.current ? 'manual' : 'stamped',
          text: `📍 Location Applied: Lat ${targetLat.toFixed(5)}°, Lng ${targetLng.toFixed(5)}° (${isManualLocationRef.current ? 'Custom Map Pin' : 'Current Location'})`
        });
      }

      // 2. Lookup ward name for watermark
      let wardName = 'Mysuru Ward';
      try {
        const res = await api.get(`/public/wards/lookup?lat=${targetLat}&lng=${targetLng}`);
        if (res.data && res.data.ward_name) {
          wardName = res.data.ward_name;
          setWardInfo(res.data);
          setIsOutsideMcc(Boolean(res.data.outside_mcc_boundary));
        }
      } catch (e) {}

      // 3. Stamp visible civic watermark bar onto image
      const stampedFile = await stampGeotagOnImage(file, {
        latitude: targetLat,
        longitude: targetLng,
        wardName,
        timestamp: detectedTime
      });

      if (stampedFile) {
        setPhoto(stampedFile);
        setPhotoPreview(URL.createObjectURL(stampedFile));
      }
    } catch (err) {
      console.error('Photo processing error:', err);
    } finally {
      setIsStamping(false);
    }
  };

  const handleGetCurrentLocation = () => {
    requestCurrentLocation(false);
  };

  const handleResetToMysuru = () => {
    handleManualLocationChange(12.3051, 76.6551);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photo) {
      setErrorMsg('Please upload or take a photograph of the civic problem.');
      return;
    }

    if (isOutsideMcc) {
      setErrorMsg('Selected location is outside Mysuru City Corporation (MCC) ward boundaries. Please drag the pin on the map into Mysuru.');
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
      const serverMsg = err.response?.data?.error || err.response?.data?.message;
      if (serverMsg) {
        setErrorMsg(serverMsg);
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setErrorMsg('Submission timed out. Please try again.');
      } else {
        setErrorMsg('Submission failed. Please check inputs and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (successResult) {
    const isMerged = successResult.merged === true;

    return (
      <div className="container" style={{ padding: '60px 20px', maxWidth: '680px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px 30px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: isMerged ? '#fef3c7' : '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            color: isMerged ? '#b45309' : '#166534'
          }}>
            {isMerged ? <Layers size={36} /> : <CheckCircle2 size={36} />}
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
            {isMerged ? 'Report Merged with Existing Civic Issue!' : 'Complaint Successfully Registered!'}
          </h2>
          
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '6px' }}>
            {isMerged 
              ? 'An existing grievance was already open within 20 meters of this location. Your photo has been merged as supplementary angle evidence.'
              : 'Your civic report has been classified, prioritized, and dispatched to MCC.'
            }
          </p>

          {/* Merge & Escalation Notification Banner */}
          {isMerged && (
            <div style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fcd34d',
              borderRadius: '8px',
              padding: '14px 18px',
              marginTop: '16px',
              textAlign: 'left',
              color: '#92400e'
            }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} /> Micro-Proximity Auto-Merge Active (Cluster Size: {successResult.report_count} Reports)
              </div>
              <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                {successResult.escalated ? (
                  <span style={{ color: '#b91c1c', fontWeight: 700 }}>
                    🔥 3+ citizen reports reached! Priority automatically escalated to HIGH for urgent MCC field action.
                  </span>
                ) : (
                  <span>
                    Total citizen reports for this spot: <strong>{successResult.report_count}</strong>.
                  </span>
                )}
              </div>
            </div>
          )}

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
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Category:</span>
              <span style={{ fontWeight: 700 }}>{successResult.category_name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Priority:</span>
              <span className={`badge badge-priority-${successResult.priority}`}>{successResult.priority}</span>
            </div>
            {successResult.sla_due_at && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>SLA Target:</span>
                <span style={{ fontWeight: 700, color: '#b45309' }}>{formatDateTime(successResult.sla_due_at)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Registered Timestamp:</span>
              <span style={{ fontWeight: 600, color: '#475569' }}>{formatDateTime(new Date().toISOString())}</span>
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
                setExifBadge(null);
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
              <div>
                <div style={{ position: 'relative', height: '230px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#0f172a' }}>
                  <img 
                    src={photoPreview} 
                    alt="Issue Preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                  <button
                    type="button"
                    onClick={() => { setPhoto(null); setPhotoPreview(null); setExifBadge(null); }}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      color: '#fff',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Change Photo
                  </button>
                  {isStamping && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      gap: '8px'
                    }}>
                      <Loader2 size={24} className="animate-spin" />
                      <span style={{ fontSize: '0.85rem' }}>Stamping Geotag Watermark...</span>
                    </div>
                  )}
                </div>

                {exifBadge && (
                  <div style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: exifBadge.type === 'exif' ? '#ecfdf5' : '#eff6ff',
                    border: `1px solid ${exifBadge.type === 'exif' ? '#a7f3d0' : '#bfdbfe'}`,
                    color: exifBadge.type === 'exif' ? '#065f46' : '#1e40af',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Sparkles size={16} />
                    <span>{exifBadge.text}</span>
                  </div>
                )}
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
                  Auto-extracts camera EXIF geotag & applies official MCC banner
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
              disabled={submitting || isOutsideMcc}
              className={`btn ${isOutsideMcc ? 'btn-outline' : 'btn-gold'}`}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1.05rem',
                marginTop: '10px',
                opacity: isOutsideMcc ? 0.6 : 1,
                cursor: isOutsideMcc ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Classifying & Submitting...
                </>
              ) : isOutsideMcc ? (
                '⚠️ Cannot Submit: Location Outside MCC'
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
              <MapPin size={18} style={{ color: '#1e3a8a' }} /> Issue Location & Ward Verification
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
              onMarkerDragEnd={handleManualLocationChange}
              onMapClick={handleManualLocationChange}
            />
          </div>

          {/* Real-time Ward Status Indicator */}
          {isOutsideMcc ? (
            <div style={{
              marginTop: '12px',
              padding: '10px 14px',
              backgroundColor: '#fee2e2',
              border: '1px solid #f87171',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Location is outside Mysuru City Corporation (MCC) boundaries!</strong>
                  <div>Complaints can only be filed within Mysuru municipal wards.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetToMysuru}
                className="btn btn-primary"
                style={{ padding: '4px 10px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
              >
                📍 Pin to Mysuru Ward
              </button>
            </div>
          ) : wardInfo && wardInfo.ward_name ? (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '8px',
              color: '#166534',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} />
                <span>Verified MCC Ward: <strong>{wardInfo.ward_name}</strong> (Ward #{wardInfo.ward_number})</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>Jurisdiction OK</span>
            </div>
          ) : null}

          <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              Lat: <strong>{latitude.toFixed(5)}</strong>, Lng: <strong>{longitude.toFixed(5)}</strong>
              {locationMode === 'manual' && (
                <span style={{ marginLeft: '8px', color: '#2563eb', fontWeight: 600, backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                  📌 Custom Pin
                </span>
              )}
            </span>
            {locationMode === 'current' && gpsAccuracy && <span>GPS Accuracy: ±{gpsAccuracy}m</span>}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
            Tip: Drag the pin or click on the map to set the exact spot.
          </div>
        </div>
      </form>
    </div>
  );
}
