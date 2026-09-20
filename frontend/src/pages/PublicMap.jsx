import React, { useState, useEffect } from 'react';
import MapView from '../components/MapView';
import api from '../services/api';
import { Layers, Flame, MapPin, Activity, CheckCircle, Clock, AlertTriangle, ChevronRight, X, Sparkles, ShieldAlert, Info } from 'lucide-react';
import { formatDateTime } from '../utils/exifHelper';
import { getImageUrl } from '../utils/imageUrl';

export default function PublicMap() {
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

  const getFilterLabel = (filter) => {
    switch (filter) {
      case 'resolved': return 'Resolved Complaints';
      case 'overdue': return 'Overdue Complaints';
      case 'high_priority': return 'High Priority Complaints';
      default: return 'All Reported Complaints';
    }
  };

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 105px)', display: 'flex', flexDirection: 'column' }}>
      {/* Map Controls Header */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 20
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Mysuru Municipal Ward Map & Civic Health Monitor
          </h2>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Click on any of the 65 official MCC wards to view metrics, or click any statistic badge to drill down into complaints.
          </div>
        </div>

        {/* Legend and Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={showHotspots} 
              onChange={(e) => setShowHotspots(e.target.checked)} 
            />
            <span style={{ color: '#dc2626', fontWeight: 600 }}>🔥 Hotspots</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={showComplaints} 
              onChange={(e) => setShowComplaints(e.target.checked)} 
            />
            <span style={{ color: '#2563eb', fontWeight: 600 }}>📍 Complaint Pins</span>
          </label>
        </div>
      </div>

      {/* Map Container */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: '#1e3a8a', marginBottom: '8px' }}>Loading Mysuru 65 Ward Boundaries...</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Rendering verified GIS GeoJSON polygons and DBSCAN clusters</div>
            </div>
          </div>
        ) : (
          <MapView 
            height="100%"
            wardGeoJson={mapData?.wards_geojson}
            hotspots={showHotspots ? (mapData?.hotspots || []) : []}
            complaints={showComplaints ? (mapData?.complaint_markers || []) : []}
            onWardSelect={(wardProps) => {
              setSelectedWard(wardProps);
              setActiveFilter(null);
            }}
          />
        )}

        {/* Sidebar Ward Details Card */}
        {selectedWard && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '340px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
            border: '1px solid #e2e8f0',
            padding: '16px',
            zIndex: 30
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  WARD {selectedWard.ward_number}
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e3a8a', margin: '2px 0 0 0' }}>
                  {selectedWard.ward_name}
                </h3>
              </div>
              <button 
                onClick={() => { setSelectedWard(null); setActiveFilter(null); }} 
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <div style={{
              backgroundColor: selectedWard.health_score < 60 ? '#fee2e2' : '#ecfdf5',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '14px'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>Ward Civic Health Score</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: selectedWard.health_score < 60 ? '#b91c1c' : '#047857' }}>
                {selectedWard.health_score} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>/ 100</span>
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: selectedWard.health_score < 60 ? '#b91c1c' : '#047857' }}>
                Rating: {selectedWard.rating}
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              CLICK ANY STATISTIC TO VIEW COMPLAINTS:
            </div>

            {/* Interactive 4 Metric Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
              {/* Total Reports */}
              <button 
                type="button"
                onClick={() => handleOpenFilter('all')}
                style={{
                  backgroundColor: activeFilter === 'all' ? '#e0f2fe' : '#f8fafc',
                  border: `1.5px solid ${activeFilter === 'all' ? '#0284c7' : '#e2e8f0'}`,
                  padding: '10px',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Total Reports</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{selectedWard.total_complaints || 0}</div>
                <div style={{ fontSize: '0.68rem', color: '#0284c7', fontWeight: 600, marginTop: '2px' }}>View list →</div>
              </button>

              {/* Resolved */}
              <button 
                type="button"
                onClick={() => handleOpenFilter('resolved')}
                style={{
                  backgroundColor: activeFilter === 'resolved' ? '#dcfce7' : '#f8fafc',
                  border: `1.5px solid ${activeFilter === 'resolved' ? '#16a34a' : '#e2e8f0'}`,
                  padding: '10px',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Resolved</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a' }}>{selectedWard.resolved_count || 0}</div>
                <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>View list →</div>
              </button>

              {/* Overdue */}
              <button 
                type="button"
                onClick={() => handleOpenFilter('overdue')}
                style={{
                  backgroundColor: activeFilter === 'overdue' ? '#fee2e2' : '#f8fafc',
                  border: `1.5px solid ${activeFilter === 'overdue' ? '#dc2626' : '#e2e8f0'}`,
                  padding: '10px',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Overdue</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626' }}>{selectedWard.overdue_count || 0}</div>
                <div style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 600, marginTop: '2px' }}>View list →</div>
              </button>

              {/* High Priority */}
              <button 
                type="button"
                onClick={() => handleOpenFilter('high_priority')}
                style={{
                  backgroundColor: activeFilter === 'high_priority' ? '#fef3c7' : '#f8fafc',
                  border: `1.5px solid ${activeFilter === 'high_priority' ? '#d97706' : '#e2e8f0'}`,
                  padding: '10px',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>High Priority</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706' }}>{selectedWard.high_priority_pending || 0}</div>
                <div style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: 600, marginTop: '2px' }}>View list →</div>
              </button>
            </div>
          </div>
        )}

        {/* Drill-down Complaints Drawer / Modal */}
        {activeFilter && selectedWard && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            width: '420px',
            maxHeight: 'calc(100vh - 150px)',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.22)',
            border: '1px solid #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 40,
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 18px',
              backgroundColor: '#1e3a8a',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 600 }}>
                  WARD {selectedWard.ward_number} - {selectedWard.ward_name}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                  {getFilterLabel(activeFilter)} ({drillComplaints.length})
                </div>
              </div>
              <button 
                onClick={() => setActiveFilter(null)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
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
              backgroundColor: '#f1f5f9',
              padding: '6px',
              borderBottom: '1px solid #e2e8f0',
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
                    fontWeight: activeFilter === tab.key ? 700 : 500,
                    backgroundColor: activeFilter === tab.key ? '#ffffff' : 'transparent',
                    color: activeFilter === tab.key ? '#1e3a8a' : '#64748b',
                    borderRadius: '6px',
                    border: 'none',
                    boxShadow: activeFilter === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
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
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
                  <div style={{ fontWeight: 600 }}>Loading ward complaints...</div>
                </div>
              ) : drillComplaints.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8' }}>
                  <Info size={32} style={{ margin: '0 auto 8px auto', color: '#cbd5e1' }} />
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
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '12px',
                        backgroundColor: isExpanded ? '#f8fafc' : '#ffffff',
                        transition: 'all 0.15s ease',
                        cursor: 'pointer'
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
                          backgroundColor: '#0f172a',
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
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e3a8a' }}>
                              {c.complaint_code}
                            </span>
                            <span className={`badge badge-priority-${c.priority}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                              {c.priority}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                            {c.category_name}
                          </div>

                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                            🕒 {formatDateTime(c.created_at)}
                          </div>
                        </div>
                      </div>

                      {/* Micro-cluster merge badge */}
                      {c.report_count && c.report_count > 1 && (
                        <div style={{
                          marginTop: '8px',
                          padding: '4px 8px',
                          backgroundColor: '#fef3c7',
                          border: '1px solid #fde68a',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          color: '#92400e',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <Sparkles size={14} />
                          <span><strong>Micro-Cluster:</strong> Reported by {c.report_count} citizens at this spot!</span>
                        </div>
                      )}

                      {/* WHY HIGH PRIORITY BANNER (Requested by Professor) */}
                      {c.priority === 'HIGH' && (
                        <div style={{
                          marginTop: '8px',
                          padding: '8px 10px',
                          backgroundColor: '#fff1f2',
                          border: '1px solid #fecdd3',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          color: '#9f1239'
                        }}>
                          <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                            <AlertTriangle size={14} /> Why High Priority?
                          </div>
                          {c.priority_reasons && c.priority_reasons.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: '16px', lineHeight: 1.4 }}>
                              {c.priority_reasons.map((reason, idx) => (
                                <li key={idx}>{reason}</li>
                              ))}
                            </ul>
                          ) : (
                            <div>Critical public health/safety risk score or proximity to sensitive institution.</div>
                          )}
                        </div>
                      )}

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div style={{
                          marginTop: '10px',
                          paddingTop: '10px',
                          borderTop: '1px dashed #cbd5e1',
                          fontSize: '0.75rem',
                          color: '#475569'
                        }}>
                          {c.description && (
                            <div style={{ marginBottom: '6px' }}>
                              <strong>Citizen Note:</strong> {c.description}
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>Status:</span>
                            <span style={{ fontWeight: 700 }}>{c.status}</span>
                          </div>
                          {c.sla_due_at && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span>SLA Deadline:</span>
                              <span style={{ fontWeight: 700, color: '#b45309' }}>{formatDateTime(c.sla_due_at)}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Coordinates:</span>
                            <span>{c.latitude?.toFixed(4)}, {c.longitude?.toFixed(4)}</span>
                          </div>
                        </div>
                      )}

                      <div style={{ textAlign: 'right', fontSize: '0.68rem', color: '#94a3b8', marginTop: '6px' }}>
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
