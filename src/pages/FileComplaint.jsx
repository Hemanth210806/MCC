import React, { useState, useEffect } from 'react';
import MapView from '../components/MapView';
import api from '../services/api';
import { Camera, MapPin, Upload, AlertCircle, CheckCircle2, ArrowRight, Loader2, Sparkles, ShieldAlert, Layers } from 'lucide-react';
import { extractExifGps, stampGeotagOnImage, formatDateTime } from '../utils/exifHelper';
import { useLanguage } from '../context/LanguageContext';
import wardsData from '../data/mysuru_wards.json';

export default function FileComplaint({ setActivePage }) {
  const { language, t } = useLanguage();
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [latitude, setLatitude] = useState(12.2958);
  const [longitude, setLongitude] = useState(76.6394);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationMode, setLocationMode] = useState('current');
  const [locationSource, setLocationSource] = useState('current');
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
  const [wardGeoJson, setWardGeoJson] = useState(wardsData);

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
    setLocationSource('manual');
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
        setLocationSource('current');
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
    requestCurrentLocation(true);
    fetchWardForPoint(latitude, longitude);

    const loadWards = async () => {
      try {
        const res = await api.get('/public/wards');
        if (res.data && res.data.type === 'FeatureCollection' && Array.isArray(res.data.features)) {
          setWardGeoJson(res.data);
        }
      } catch (err) {
        // fallback to silent
      }
    };
    loadWards();
  }, []);

  const handleGetCurrentLocation = () => {
    requestCurrentLocation(false);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setErrorMsg('');
    setPhoto(file);
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);

    try {
      const extractedGps = await extractExifGps(file);
      if (extractedGps && extractedGps.latitude && extractedGps.longitude) {
        setLatitude(extractedGps.latitude);
        setLongitude(extractedGps.longitude);
        setLocationMode('exif');
        setLocationSource('exif');
        setGpsAccuracy(extractedGps.altitude ? Math.round(extractedGps.altitude) : 5);
        setExifBadge({
          type: 'exif',
          text: `🎯 Camera EXIF Geotag: Lat ${extractedGps.latitude.toFixed(5)}°, Lng ${extractedGps.longitude.toFixed(5)}°`
        });
        fetchWardForPoint(extractedGps.latitude, extractedGps.longitude);

        setIsStamping(true);
        try {
          const stampedBlob = await stampGeotagOnImage(file, {
            lat: extractedGps.latitude,
            lng: extractedGps.longitude,
            ward: wardInfo?.ward_name || 'Mysuru Ward',
            timestamp: new Date().toISOString()
          });
          const stampedFile = new File([stampedBlob], file.name, { type: 'image/jpeg' });
          setPhoto(stampedFile);
          setPhotoPreview(URL.createObjectURL(stampedBlob));
        } catch (stampErr) {
          console.warn('Geotag watermarking failed, using original file', stampErr);
        } finally {
          setIsStamping(false);
        }
      } else {
        setExifBadge({
          type: 'browser',
          text: `ℹ️ Photo has no embedded EXIF. Using selected map pin.`
        });
      }
    } catch (err) {
      console.warn('EXIF read error:', err);
    }
  };

  const handleResetToMysuru = () => {
    handleManualLocationChange(12.3051, 76.6551);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photo) {
      setErrorMsg(language === 'kn' ? 'ದಯವಿಟ್ಟು ಸಮಸ್ಯೆಯ ಫೋಟೋವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.' : 'Please upload or take a photograph of the civic problem.');
      return;
    }

    if (isOutsideMcc) {
      setErrorMsg(language === 'kn' ? 'ಆಯ್ಕೆಮಾಡಿದ ಸ್ಥಳವು ಮೈಸೂರು ಪಾಲಿಕೆ ಗಡಿಯ ಹೊರಗಿದೆ. ದಯವಿಟ್ಟು ಮೈಸೂರು ವಾರ್ಡ್ ಒಳಗೆ ಗುರುತಿಸಿ.' : 'Selected location is outside Mysuru City Corporation (MCC) ward boundaries. Please drag the pin on the map into Mysuru.');
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
      formData.append('location_source', locationSource);
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
      <div style={{ backgroundColor: '#faf6ec', minHeight: '100vh', padding: '60px 20px', color: '#1f241a' }}>
        <div className="container" style={{ maxWidth: '680px' }}>
          <div className="card" style={{ textAlign: 'center', padding: '40px 30px', backgroundColor: '#ffffff', borderColor: '#e5dcbe', boxShadow: '0 4px 18px rgba(75, 94, 40, 0.12)' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: isMerged ? '#fef5e7' : '#edf7e7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: isMerged ? '#b38328' : '#4b5e28',
              border: `1.5px solid ${isMerged ? '#b38328' : '#4b5e28'}`
            }}>
              {isMerged ? <Layers size={36} /> : <CheckCircle2 size={36} />}
            </div>

            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1f241a' }}>
              {isMerged 
                ? (language === 'kn' ? 'ಹಾಲಿ ಸಮಸ್ಯೆಯೊಂದಿಗೆ ದೂರು ವಿಲೀನಗೊಂಡಿದೆ!' : 'Report Merged with Existing Civic Issue!')
                : (language === 'kn' ? 'ದೂರು ಯಶಸ್ವಿಯಾಗಿ ನೋಂದಣಿಯಾಗಿದೆ!' : 'Complaint Successfully Registered!')}
            </h2>
            
            <p style={{ color: '#5e6654', fontSize: '0.95rem', marginTop: '6px', lineHeight: 1.6 }}>
              {isMerged
                ? (language === 'kn' ? 'ಇದೇ ಸ್ಥಳದಲ್ಲಿ ಈಗಾಗಲೇ ಮತ್ತೊಬ್ಬ ನಾಗರಿಕರು ದೂರು ದಾಖಲಿಸಿದ್ದಾರೆ. ನಿಮ್ಮ ದೂರು ಆ ಸಮಸ್ಯೆಗೆ +೧ ಅಂಕವಾಗಿ ಸೇರ್ಪಡೆಯಾಗಿದೆ.' : 'Another citizen already reported an issue at this exact location. Your report has been merged, incrementing its community priority cluster.')
                : (language === 'kn' ? 'ನಿಮ್ಮ ದೂರನ್ನು ಸ್ವಯಂ ವರ್ಗೀಕರಿಸಿ ಸಂಬಂಧಪಟ್ಟ ವಾರ್ಡ್ ಅಧಿಕಾರಿಗೆ ರವಾನಿಸಲಾಗಿದೆ.' : 'Your report has been analyzed, geotagged, and dispatched to the ward field engineering squad.')}
            </p>

            <div style={{ backgroundColor: '#fcfaf4', borderRadius: '10px', padding: '20px', margin: '24px 0', textAlign: 'left', border: '1.5px solid #e8dfc9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#5e6654', fontWeight: 700 }}>Complaint ID:</span>
                <span style={{ fontWeight: 800, color: '#b38328', fontSize: '1.05rem' }}>{successResult.complaint_code}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#5e6654', fontWeight: 700 }}>AI Classified Category:</span>
                <span style={{ fontWeight: 800, color: '#1f241a' }}>{successResult.category_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#5e6654', fontWeight: 700 }}>Assigned Ward:</span>
                <span style={{ fontWeight: 700, color: '#4b5e28' }}>{successResult.ward_name} (Ward #{successResult.ward_number})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#5e6654', fontWeight: 700 }}>Priority:</span>
                <span className={`badge badge-priority-${successResult.priority}`}>{successResult.priority}</span>
              </div>
              {successResult.sla_due_at && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#5e6654', fontWeight: 700 }}>SLA Target:</span>
                  <span style={{ fontWeight: 800, color: '#b38328' }}>{formatDateTime(successResult.sla_due_at)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: '#5e6654', fontWeight: 700 }}>Registered Timestamp:</span>
                <span style={{ fontWeight: 700, color: '#1f241a' }}>{formatDateTime(new Date().toISOString())}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                type="button"
                onClick={() => setActivePage('track')}
                className="btn btn-olive"
                style={{ padding: '12px 24px', fontWeight: 700, backgroundColor: '#4b5e28', color: '#ffffff' }}
              >
                Track Complaint Status <ArrowRight size={16} />
              </button>
              <button 
                type="button"
                onClick={() => {
                  setSuccessResult(null);
                  setPhoto(null);
                  setPhotoPreview(null);
                  setExifBadge(null);
                  setDescription('');
                }}
                className="btn btn-outline"
                style={{ padding: '12px 24px', borderColor: '#4b5e28', color: '#3d4d20' }}
              >
                File Another Issue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#faf6ec', minHeight: '100vh', padding: '40px 0', color: '#1f241a' }}>
      <div className="container" style={{ maxWidth: '1080px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#1f241a' }}>
            {language === 'kn' ? 'ನಾಗರಿಕ ದೂರು ಸಲ್ಲಿಸಿ' : 'Report a Civic Issue'}
          </h2>
          <p style={{ color: '#5e6654', fontSize: '0.95rem', marginTop: '4px' }}>
            {language === 'kn' 
              ? 'ಸಮಸ್ಯೆಯ ಫೋಟೋ ತೆಗೆದು ಜಿಪಿಎಸ್ ಸ್ಥಳದೊಂದಿಗೆ ಸಲ್ಲಿಸಿ. ಕಡ್ಡಾಯ ಲಾಗಿನ್ ಅಗತ್ಯವಿಲ್ಲ.' 
              : 'Upload a photo and share your GPS location. No mandatory registration required.'}
          </p>
        </div>

        {errorMsg && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1.5px solid #fca5a5',
            color: '#b91c1c',
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
            <div className="card" style={{ backgroundColor: '#ffffff', borderColor: '#e5dcbe', boxShadow: '0 2px 8px rgba(75, 94, 40, 0.05)' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5e28', fontWeight: 800 }}>
                <Camera size={18} color="#4b5e28" /> {language === 'kn' ? 'ಸಮಸ್ಯೆಯ ಛಾಯಾಚಿತ್ರ (ಕಡ್ಡಾಯ)' : 'Issue Photograph (Required)'}
              </label>

              {photoPreview ? (
                <div>
                  <div style={{ position: 'relative', height: '230px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f5efe1', border: '1.5px solid #e5dcbe' }}>
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
                        backgroundColor: 'rgba(253, 249, 238, 0.95)',
                        color: '#1f241a',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: '1px solid #dcd3b8',
                        cursor: 'pointer'
                      }}
                    >
                      Change Photo
                    </button>
                    {isStamping && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(253, 249, 238, 0.85)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#4b5e28',
                        gap: '8px'
                      }}>
                        <Loader2 size={24} className="animate-spin" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Stamping Geotag Watermark...</span>
                      </div>
                    )}
                  </div>

                  {exifBadge && (
                    <div style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#edf7e7',
                      border: '1px solid #b8df9c',
                      color: '#36651e',
                      fontSize: '0.8rem',
                      fontWeight: 600,
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
                  border: '2px dashed #b8cca2',
                  borderRadius: '10px',
                  padding: '34px 20px',
                  textAlign: 'center',
                  backgroundColor: '#fcfaf4',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }} onClick={() => document.getElementById('photo-input').click()}>
                  <Upload size={38} style={{ color: '#4b5e28', margin: '0 auto 10px auto' }} />
                  <div style={{ fontWeight: 800, color: '#1f241a', fontSize: '0.98rem' }}>
                    {language === 'kn' ? 'ಫೋಟೋ ತೆಗೆಯಲು ಅಥವಾ ಅಪ್‌ಲೋಡ್ ಮಾಡಲು ಕ್ಲಿಕ್ ಮಾಡಿ' : 'Click to take or upload a photo'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#5e6654', marginTop: '6px' }}>
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
            <div className="card" style={{ backgroundColor: '#ffffff', borderColor: '#e5dcbe', boxShadow: '0 2px 8px rgba(75, 94, 40, 0.05)' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#1f241a', marginBottom: '14px' }}>
                {language === 'kn' ? 'ವಿವರಣೆ ಮತ್ತು ಸಂಪರ್ಕ ಮಾಹಿತಿ (ಐಚ್ಛಿಕ)' : 'Description & Contact Details (Optional)'}
              </h4>

              <div className="form-group">
                <label className="form-label">{language === 'kn' ? 'ಸಮಸ್ಯೆಯ ವಿವರಣೆ' : 'Brief Description'}</label>
                <textarea 
                  className="form-textarea"
                  rows="3"
                  placeholder={language === 'kn' ? 'ಉದಾ: ಕುವೆಂಪುನಗರ ಬಸ್ ನಿಲ್ದಾಣ ಸಮೀಪ ಬೀದಿದೀಪ ದೋಷ...' : 'e.g. Broken streetlight near Kuvempunagar complex bus stop...'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">{language === 'kn' ? 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ' : 'Mobile Number'}</label>
                  <input 
                    type="tel"
                    className="form-input"
                    placeholder="10-digit mobile"
                    value={citizenPhone}
                    onChange={(e) => setCitizenPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{language === 'kn' ? 'ಹೆಸರು' : 'Your Name'}</label>
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
                className="btn btn-olive"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '1.05rem',
                  marginTop: '10px',
                  opacity: isOutsideMcc ? 0.6 : 1,
                  cursor: isOutsideMcc ? 'not-allowed' : 'pointer',
                  fontWeight: 800,
                  backgroundColor: '#4b5e28',
                  color: '#ffffff'
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> {language === 'kn' ? 'ವರ್ಗೀಕರಿಸಿ ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ...' : 'Classifying & Submitting...'}
                  </>
                ) : isOutsideMcc ? (
                  language === 'kn' ? '⚠️ ಸಲ್ಲಿಸಲಾಗುವುದಿಲ್ಲ: ಮೈಸೂರು ಪಾಲಿಕೆ ವ್ಯಾಪ್ತಿಯ ಹೊರಗಿದೆ' : '⚠️ Cannot Submit: Location Outside MCC'
                ) : (
                  language === 'kn' ? 'ನಾಗರಿಕ ದೂರು ಸಲ್ಲಿಸಿ' : 'Submit Civic Complaint'
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Interactive Location Picker */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', borderColor: '#e5dcbe', boxShadow: '0 2px 8px rgba(75, 94, 40, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px', color: '#4b5e28', fontWeight: 800 }}>
                <MapPin size={18} color="#4b5e28" /> {language === 'kn' ? 'ಸ್ಥಳ & ವಾರ್ಡ್ ಪರಿಶೀಲನೆ' : 'Issue Location & Ward Verification'}
              </label>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={locating}
                className="btn btn-outline"
                style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#3d4d20', borderColor: '#4b5e28' }}
              >
                {locating ? 'Capturing GPS...' : '📍 Use My Current Location'}
              </button>
            </div>

            <div style={{ flex: 1, minHeight: '340px', borderRadius: '10px', overflow: 'hidden', border: '1.5px solid #e5dcbe' }}>
              <MapView 
                height="100%"
                center={[latitude, longitude]}
                zoom={14}
                wardGeoJson={wardGeoJson}
                draggableMarker={{ lat: latitude, lng: longitude }}
                showDraggableMarker={true}
                onMarkerDragEnd={handleManualLocationChange}
                onMapClick={handleManualLocationChange}
              />
            </div>

            {/* Real-time Ward Status Indicator */}
            {isOutsideMcc ? (
              <div style={{
                marginTop: '14px',
                padding: '12px 14px',
                backgroundColor: '#fef2f2',
                border: '1.5px solid #fca5a5',
                borderRadius: '8px',
                color: '#b91c1c',
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
                  className="btn btn-olive"
                  style={{ padding: '4px 10px', fontSize: '0.75rem', whiteSpace: 'nowrap', backgroundColor: '#4b5e28', color: '#ffffff' }}
                >
                  📍 Pin to Mysuru Ward
                </button>
              </div>
            ) : wardInfo && wardInfo.ward_name ? (
              <div style={{
                marginTop: '14px',
                padding: '10px 14px',
                backgroundColor: '#edf7e7',
                border: '1px solid #b8df9c',
                borderRadius: '8px',
                color: '#36651e',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} color="#4b5e28" />
                  <span>Verified MCC Ward: <strong>{wardInfo.ward_name}</strong> (Ward #{wardInfo.ward_number})</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#4b5e28', fontWeight: 800 }}>Jurisdiction OK</span>
              </div>
            ) : null}

            <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#5e6654', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                Lat: <strong>{latitude.toFixed(5)}</strong>, Lng: <strong>{longitude.toFixed(5)}</strong>
                {locationMode === 'manual' && (
                  <span style={{ marginLeft: '8px', color: '#3d4d20', fontWeight: 700, backgroundColor: '#edf4e4', padding: '2px 8px', borderRadius: '4px', border: '1px solid #b8df9c' }}>
                    📌 Custom Pin
                  </span>
                )}
              </span>
              {locationMode === 'current' && gpsAccuracy && <span>GPS Accuracy: ±{gpsAccuracy}m</span>}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#7e8774', marginTop: '4px' }}>
              Tip: Drag the pin or click on the map to set the exact spot.
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
