import React, { useState, useEffect } from 'react';
import MapView from '../components/MapView';
import api from '../services/api';
import { Layers, Flame, MapPin, Activity, CheckCircle, Clock } from 'lucide-react';

export default function PublicMap() {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWard, setSelectedWard] = useState(null);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showComplaints, setShowComplaints] = useState(true);

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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            Mysuru Municipal Ward Map & Civic Health Monitor
          </h2>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Click on any of the 65 official MCC wards to view real-time civic metrics and health scores.
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
            onWardSelect={(wardProps) => setSelectedWard(wardProps)}
          />
        )}

        {/* Sidebar Ward Details Card */}
        {selectedWard && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '320px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0',
            padding: '16px',
            zIndex: 30
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                  WARD {selectedWard.ward_number}
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e3a8a' }}>
                  {selectedWard.ward_name}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedWard(null)} 
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#94a3b8', cursor: 'pointer' }}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
                <div style={{ color: '#64748b' }}>Total Reports</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{selectedWard.total_complaints || 0}</div>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
                <div style={{ color: '#64748b' }}>Resolved</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#16a34a' }}>{selectedWard.resolved_count || 0}</div>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
                <div style={{ color: '#64748b' }}>Overdue</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#dc2626' }}>{selectedWard.overdue_count || 0}</div>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
                <div style={{ color: '#64748b' }}>High Priority</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#b45309' }}>{selectedWard.high_priority_pending || 0}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
