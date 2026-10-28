import React, { useState, useEffect } from 'react';
import MapView from '../components/MapView';
import api from '../services/api';
import { Layers, Flame, MapPin, Activity, CheckCircle, Clock, AlertTriangle, ChevronRight, X, Sparkles, ShieldAlert, Info } from 'lucide-react';
import { formatDateTime } from '../utils/exifHelper';
import { getImageUrl } from '../utils/imageUrl';
import { useLanguage } from '../context/LanguageContext';

export default function PublicMap() {
  const { language, t } = useLanguage();
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWard, setSelectedWard] = useState(null);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showComplaints, setShowComplaints] = useState(true);

  // Drill-down complaints modal/drawer state
  const [activeFilter, setActiveFilter] = useState(null); // 'all' | 'resolved' | 'overdue' | 'high_priority'
  const [drillComplaints, setDrillComplaints] = useState([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [expandedComplaintId, setExpandedComplaintId] = useState(null);

  useEffect(() => {
    const loadMapData = async () => {
      try {
        const res = await api.get('/public/map-data');
        setMapData(res.data);
      } catch (err) {
        console.error("Failed to load public map data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadMapData();
  }, []);

  const allWardsList = React.useMemo(() => {
    if (!mapData?.wards_geojson?.features) return [];
    const list = mapData.wards_geojson.features
      .map(f => f.properties)
      .filter(p => p && p.ward_number);
    return list.sort((a, b) => Number(a.ward_number) - Number(b.ward_number));
  }, [mapData]);

  // Fetch complaints when filter or ward changes
  const handleOpenFilter = async (filterType, wardProps) => {
    const ward = wardProps || selectedWard;
    if (!ward) return;

    setActiveFilter(filterType);
    setDrillLoading(true);
    setExpandedComplaintId(null);

    const wardId = ward.ward_id || ward.ward_number;
    try {
      const res = await api.get(`/public/wards/${wardId}/complaints?filter=${filterType}`);
      setDrillComplaints(res.data.complaints || []);
    } catch (err) {
      console.error("Failed to load ward complaints:", err);
      setDrillComplaints([]);
    } finally {
      setDrillLoading(false);
    }
  };

  const getFilterLabel = (type) => {
    switch (type) {
      case 'resolved': return language === 'kn' ? 'ಪರಿಹಾರವಾದ ದೂರುಗಳು' : 'Resolved Complaints';
      case 'overdue': return language === 'kn' ? 'ವಿಳಂಬಿತ (ಓವರ್‌ಡ್ಯೂ) ದೂರುಗಳು' : 'Overdue Complaints';
      case 'high_priority': return language === 'kn' ? 'ಹೆಚ್ಚಿನ ಆದ್ಯತೆಯ ದೂರುಗಳು' : 'High Priority Complaints';
      default: return language === 'kn' ? 'ಎಲ್ಲಾ ದಾಖಲಿತ ದೂರುಗಳು' : 'All Reported Complaints';
    }
  };

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 105px)', display: 'flex', flexDirection: 'column', backgroundColor: '#faf6ec' }}>
      {/* Map Controls Header in Royal Light Gold & Olive */}
      <div style={{
        backgroundColor: '#fbf7ee',
        borderBottom: '1.5px solid #e6dcbe',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 20,
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(75, 94, 40, 0.05)'
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1f241a', margin: 0 }}>
            {language === 'kn' ? 'ಮೈಸೂರು ೬೫ ವಾರ್ಡ್ ನಕ್ಷೆ & ನಾಗರಿಕ ಆರೋಗ್ಯ ಮಾನಿಟರ್' : 'Mysuru Municipal Ward Map & Civic Health Monitor'}
          </h2>
          <div style={{ fontSize: '0.78rem', color: '#5e6654' }}>
            {language === 'kn' 
              ? 'ಡ್ರಾಪ್‌ಡೌನ್‌ನಿಂದ ವಾರ್ಡ್ ಆಯ್ಕೆಮಾಡಿ ಅಥವಾ ನಕ್ಷೆಯಲ್ಲಿ ಬಹುಭುಜಾಕೃತಿ ಕ್ಲಿಕ್ ಮಾಡಿ.' 
              : 'Select any ward from the dropdown or click a polygon on the map to inspect civic metrics.'}
          </div>
        </div>

        {/* Ward Selector Dropdown & Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#4b5e28' }}>
              {language === 'kn' ? 'ವಾರ್ಡ್ ಆಯ್ಕೆ:' : 'Select Ward:'}
            </span>
            <select
              id="map-ward-dropdown"
              value={selectedWard?.ward_number || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setSelectedWard(null);
                  setActiveFilter(null);
                  return;
                }
                const found = allWardsList.find(w => String(w.ward_number) === String(val));
                if (found) {
                  setSelectedWard(found);
                  setActiveFilter(null);
                }
              }}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1.5px solid #dcd3b8',
                backgroundColor: '#ffffff',
                color: '#1f241a',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none',
                minWidth: '220px',
                boxShadow: '0 1px 4px rgba(75, 94, 40, 0.08)'
              }}
            >
              <option value="">{language === 'kn' ? '-- ವಾರ್ಡ್‌ಗೆ ತೆರಳಿ (೬೫ ವಾರ್ಡ್‌ಗಳು) --' : '-- Jump to Ward (All 65) --'}</option>
              {allWardsList.map((w) => (
                <option key={w.ward_number} value={w.ward_number}>
                  Ward {w.ward_number}: {w.ward_name} ({w.rating || 'HEALTHY'})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={showHotspots} 
                onChange={(e) => setShowHotspots(e.target.checked)} 
              />
              <span style={{ color: '#dc2626', fontWeight: 700 }}>🔥 Hotspots</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={showComplaints} 
                onChange={(e) => setShowComplaints(e.target.checked)} 
              />
              <span style={{ color: '#4b5e28', fontWeight: 700 }}>📍 Complaint Pins</span>
            </label>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#faf6ec' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, color: '#4b5e28', marginBottom: '8px' }}>
                {language === 'kn' ? 'ಮೈಸೂರು ೬೫ ವಾರ್ಡ್ ಗಡಿಗಳು ಲೋಡ್ ಆಗುತ್ತಿವೆ...' : 'Loading Mysuru 65 Ward Boundaries...'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#5e6654' }}>Rendering verified GIS GeoJSON polygons and DBSCAN clusters</div>
            </div>
          </div>
        ) : (
          <MapView 
            height="100%"
            wardGeoJson={mapData?.wards_geojson}
            hotspots={showHotspots ? (mapData?.hotspots || []) : []}
            complaints={showComplaints ? (mapData?.complaint_markers || []) : []}
            selectedWardNumber={selectedWard?.ward_number}
            onWardSelect={(wardProps) => {
              setSelectedWard(wardProps);
              setActiveFilter(null);
            }}
          />
        )}

        {/* Sidebar Ward Details Card in Royal Light Gold & Olive */}
        {selectedWard && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '340px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(75, 94, 40, 0.14)',
            border: '1.5px solid #e5dcbe',
            padding: '16px',
            zIndex: 30
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b38328', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  WARD {selectedWard.ward_number}
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1f241a', margin: '2px 0 0 0' }}>
                  {selectedWard.ward_name}
                </h3>
              </div>
              <button 
                onClick={() => { setSelectedWard(null); setActiveFilter(null); }} 
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: '#5e6654', cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <div style={{
              backgroundColor: selectedWard.health_score < 60 ? '#fef2f2' : '#edf7e7',
              border: `1.5px solid ${selectedWard.health_score < 60 ? '#fca5a5' : '#b8df9c'}`,
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '14px'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#5e6654', fontWeight: 700 }}>Ward Civic Health Score</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: selectedWard.health_score < 60 ? '#dc2626' : '#36651e' }}>
                {selectedWard.health_score} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#5e6654' }}>/ 100</span>
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: selectedWard.health_score < 60 ? '#b91c1c' : '#4b5e28' }}>
                Rating: {selectedWard.rating}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#5e6654' }}>
                {language === 'kn' ? 'ದೂರುಗಳ ವಿವರ ವೀಕ್ಷಿಸಿ:' : 'CLICK STATISTIC OR CHOOSE:'}
              </div>
              <select
                value={activeFilter || ''}
                onChange={(e) => e.target.value ? handleOpenFilter(e.target.value) : setActiveFilter(null)}
                style={{
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #dcd3b8',
                  color: '#1f241a',
                  fontWeight: 700,
                  backgroundColor: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <option value="">Filter List...</option>
                <option value="all">All Reports ({selectedWard.total_complaints || 0})</option>
                <option value="resolved">Resolved ({selectedWard.resolved_count || 0})</option>
                <option value="overdue">Overdue ({selectedWard.overdue_count || 0})</option>
                <option value="high_priority">High Priority ({selectedWard.high_priority_pending || 0})</option>
              </select>
            </div>

            {/* Interactive 4 Metric Badges in Royal Light Gold & Olive */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
              {/* Total Reports */}
              <button 
                type="button"
                onClick={() => handleOpenFilter('all')}
                style={{
                  backgroundColor: activeFilter === 'all' ? '#edf4e4' : '#ffffff',
                  border: `1.5px solid ${activeFilter === 'all' ? '#4b5e28' : '#e5dcbe'}`,
                  padding: '10px',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ color: '#5e6654', fontSize: '0.75rem', fontWeight: 600 }}>Total Reports</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1f241a' }}>{selectedWard.total_complaints || 0}</div>
                <div style={{ fontSize: '0.68rem', color: '#4b5e28', fontWeight: 700, marginTop: '2px' }}>View list →</div>
              </button>

              {/* Resolved */}
              <button 
                type="button"
                onClick={() => handleOpenFilter('resolved')}
                style={{
                  backgroundColor: activeFilter === 'resolved' ? '#edf7e7' : '#ffffff',
                  border: `1.5px solid ${activeFilter === 'resolved' ? '#4b5e28' : '#e5dcbe'}`,
                  padding: '10px',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ color: '#5e6654', fontSize: '0.75rem', fontWeight: 600 }}>Resolved</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#36651e' }}>{selectedWard.resolved_count || 0}</div>
                <div style={{ fontSize: '0.68rem', color: '#36651e', fontWeight: 700, marginTop: '2px' }}>View list →</div>
              </button>

              {/* Overdue */}
              <button 
                type="button"
                onClick={() => handleOpenFilter('overdue')}
                style={{
                  backgroundColor: activeFilter === 'overdue' ? '#fef2f2' : '#ffffff',
                  border: `1.5px solid ${activeFilter === 'overdue' ? '#dc2626' : '#e5dcbe'}`,
                  padding: '10px',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ color: '#5e6654', fontSize: '0.75rem', fontWeight: 600 }}>Overdue</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626' }}>{selectedWard.overdue_count || 0}</div>
                <div style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 700, marginTop: '2px' }}>View list →</div>
              </button>

              {/* High Priority */}
              <button 
                type="button"
                onClick={() => handleOpenFilter('high_priority')}
                style={{
                  backgroundColor: activeFilter === 'high_priority' ? '#fef5e7' : '#ffffff',
                  border: `1.5px solid ${activeFilter === 'high_priority' ? '#b38328' : '#e5dcbe'}`,
                  padding: '10px',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ color: '#5e6654', fontSize: '0.75rem', fontWeight: 600 }}>High Priority</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b38328' }}>{selectedWard.high_priority_pending || 0}</div>
                <div style={{ fontSize: '0.68rem', color: '#b38328', fontWeight: 700, marginTop: '2px' }}>View list →</div>
              </button>
            </div>
          </div>
        )}

        {/* Drill-down Complaints Drawer / Modal in Royal Light Gold & Olive */}
        {activeFilter && selectedWard && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            width: '420px',
            maxHeight: 'calc(100vh - 150px)',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 12px 30px rgba(75, 94, 40, 0.16)',
            border: '1.5px solid #e5dcbe',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 40,
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 18px',
              backgroundColor: '#f5efe1',
              borderBottom: '1.5px solid #e5dcbe',
              color: '#1f241a',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#b38328', fontWeight: 800 }}>
                  WARD {selectedWard.ward_number} - {selectedWard.ward_name}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1f241a' }}>
                  {getFilterLabel(activeFilter)} ({drillComplaints.length})
                </div>
              </div>
              <button 
                onClick={() => setActiveFilter(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#5e6654',
                  padding: '4px 8px',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Toggle Bar */}
            <div style={{
              display: 'flex',
              backgroundColor: '#fcfaf4',
              padding: '6px',
              borderBottom: '1px solid #e8dfc9',
              gap: '4px'
            }}>
              {[
                { key: 'all', label: 'All' },
                { key: 'resolved', label: 'Resolved' },
                { key: 'overdue', label: 'Overdue' },
                { key: 'high_priority', label: 'High Priority' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleOpenFilter(tab.key)}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    fontSize: '0.72rem',
                    fontWeight: activeFilter === tab.key ? 800 : 600,
                    backgroundColor: activeFilter === tab.key ? '#4b5e28' : 'transparent',
                    color: activeFilter === tab.key ? '#ffffff' : '#5e6654',
                    borderRadius: '6px',
                    border: 'none',
                    boxShadow: activeFilter === tab.key ? '0 1px 3px rgba(75, 94, 40, 0.3)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Complaints List Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {drillLoading ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#5e6654' }}>
                  <div style={{ fontWeight: 600 }}>Loading ward complaints...</div>
                </div>
              ) : drillComplaints.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#5e6654' }}>
                  <Info size={32} style={{ margin: '0 auto 8px auto', color: '#8e9683' }} />
                  <div style={{ fontWeight: 600 }}>No {getFilterLabel(activeFilter).toLowerCase()} found for this ward.</div>
                </div>
              ) : (
                drillComplaints.map((c) => {
                  const isExpanded = expandedComplaintId === c.id;
                  const photoSrc = getImageUrl(c.photo_url || c.images?.[0]?.image_path, c.category_name);

                  return (
                    <div 
                      key={c.id}
                      style={{
                        border: '1.5px solid #e5dcbe',
                        borderRadius: '8px',
                        padding: '12px',
                        backgroundColor: isExpanded ? '#fbf7ee' : '#ffffff',
                        transition: 'all 0.15s ease',
                        cursor: 'pointer',
                        boxShadow: '0 1px 4px rgba(75, 94, 40, 0.04)'
                      }}
                      onClick={() => setExpandedComplaintId(isExpanded ? null : c.id)}
                    >
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        {/* Thumbnail */}
                        <div style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          backgroundColor: '#f5efe1',
                          border: '1px solid #e5dcbe',
                          flexShrink: 0
                        }}>
                          <img 
                            src={photoSrc} 
                            alt={c.category_name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        </div>

                        {/* Title & Metadata */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#b38328' }}>
                              {c.complaint_code}
                            </span>
                            <span className={`badge badge-priority-${c.priority}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                              {c.priority}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1f241a', marginTop: '2px' }}>
                            {c.category_name}
                          </div>

                          <div style={{ fontSize: '0.72rem', color: '#5e6654', marginTop: '3px' }}>
                            🕒 {formatDateTime(c.created_at)}
                          </div>
                        </div>
                      </div>

                      {/* Micro-cluster merge badge */}
                      {c.report_count && c.report_count > 1 && (
                        <div style={{
                          marginTop: '8px',
                          padding: '4px 8px',
                          backgroundColor: '#fef5e7',
                          border: '1px solid #b38328',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          color: '#8f681a',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <Sparkles size={14} color="#b38328" />
                          <span><strong>Micro-Cluster:</strong> Reported by {c.report_count} citizens at this spot!</span>
                        </div>
                      )}

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div style={{
                          marginTop: '10px',
                          paddingTop: '10px',
                          borderTop: '1px dashed #e5dcbe',
                          fontSize: '0.75rem',
                          color: '#4a5040'
                        }}>
                          {c.description && (
                            <div style={{ marginBottom: '6px' }}>
                              <strong style={{ color: '#b38328' }}>Citizen Note:</strong> {c.description}
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>Status:</span>
                            <span style={{ fontWeight: 700, color: '#1f241a' }}>{c.status}</span>
                          </div>
                          {c.sla_due_at && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span>SLA Deadline:</span>
                              <span style={{ fontWeight: 700, color: '#b38328' }}>{formatDateTime(c.sla_due_at)}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Coordinates:</span>
                            <span>{c.latitude?.toFixed(4)}, {c.longitude?.toFixed(4)}</span>
                          </div>
                        </div>
                      )}

                      <div style={{ textAlign: 'right', fontSize: '0.68rem', color: '#4b5e28', fontWeight: 600, marginTop: '6px' }}>
                        {isExpanded ? 'Click to collapse ▲' : 'Click for full details ▼'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
