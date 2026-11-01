import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { wardsData } from '../data/civicData';
import { useLanguage } from '../context/LanguageContext';
import { Flame, ShieldCheck, AlertTriangle, Layers, Eye, MapPin, Sparkles, Filter } from 'lucide-react';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Color scales matching royal theme
function getDensityColor(count) {
  if (count >= 6) return '#dc2626'; // Critical - Crimson Red
  if (count >= 4) return '#ea580c'; // High - Warm Amber Orange
  if (count >= 2) return '#ca8a04'; // Moderate - Royal Gold
  return '#4b5e28';                // Low - Royal Olive Green
}

function getDensityTier(count, language = 'en') {
  if (count >= 6) return language === 'kn' ? 'ತೀವ್ರ ಸಾಂದ್ರತೆ (ಕ್ರಿಟಿಕಲ್)' : 'CRITICAL DENSITY';
  if (count >= 4) return language === 'kn' ? 'ಹೆಚ್ಚಿನ ಸಾಂದ್ರತೆ' : 'HIGH DENSITY';
  if (count >= 2) return language === 'kn' ? 'ಮಧ್ಯಮ ಸಾಂದ್ರತೆ' : 'MODERATE DENSITY';
  return language === 'kn' ? 'ಕಡಿಮೆ / ಸ್ಥಿರ ಸಾಂದ್ರತೆ' : 'LOW / STABLE';
}

export default function WardHeatMap({ complaints = [], onSelectWard = null }) {
  const { language, t } = useLanguage();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const geojsonLayerRef = useRef(null);
  const heatMarkersLayerRef = useRef(null);

  const [selectedWard, setSelectedWard] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showHotspots, setShowHotspots] = useState(true);

  // Compute complaint count per ward
  const { wardCounts, criticalCount, highCount, moderateCount, lowCount, categoryBreakdown } = useMemo(() => {
    const counts = {};
    const catMap = {};

    complaints.forEach(c => {
      if (c.status === 'RESOLVED' || c.status === 'REJECTED') return;
      if (selectedCategory !== 'all' && c.category_name !== selectedCategory) return;

      const wNum = c.ward_number || c.ward_id;
      if (wNum) {
        counts[wNum] = (counts[wNum] || 0) + 1;
        if (!catMap[wNum]) catMap[wNum] = {};
        catMap[wNum][c.category_name] = (catMap[wNum][c.category_name] || 0) + 1;
      }
    });

    let crit = 0, high = 0, mod = 0, low = 0;
    (wardsData.features || []).forEach(f => {
      const wNum = f.properties.ward_number;
      const count = counts[wNum] || 0;
      if (count >= 6) crit++;
      else if (count >= 4) high++;
      else if (count >= 2) mod++;
      else low++;
    });

    return {
      wardCounts: counts,
      criticalCount: crit,
      highCount: high,
      moderateCount: mod,
      lowCount: low,
      categoryBreakdown: catMap
    };
  }, [complaints, selectedCategory]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [12.3052, 76.6450],
      zoom: 12,
      zoomControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Choropleth Heat Layer
  useEffect(() => {
    if (!mapRef.current) return;

    if (geojsonLayerRef.current) {
      mapRef.current.removeLayer(geojsonLayerRef.current);
    }

    const geoLayer = L.geoJSON(wardsData, {
      style: (feature) => {
        const wNum = feature.properties.ward_number;
        const count = wardCounts[wNum] || 0;
        const color = getDensityColor(count);
        const isSelected = selectedWard && selectedWard.ward_number === wNum;

        return {
          fillColor: color,
          weight: isSelected ? 3.5 : 1.5,
          opacity: 0.9,
          color: isSelected ? '#1f241a' : color,
          fillOpacity: count >= 6 ? 0.65 : (count >= 4 ? 0.50 : (count >= 2 ? 0.36 : 0.20)),
          dashArray: isSelected ? '' : '2, 3'
        };
      },
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        const count = wardCounts[p.ward_number] || 0;
        const tier = getDensityTier(count, language);

        layer.bindTooltip(
          `<strong>Ward ${p.ward_number} - ${p.ward_name}</strong><br/>
           <span style="color:${getDensityColor(count)};font-weight:700;">${count} Active Issues (${tier})</span>`,
          { sticky: true, className: 'leaflet-custom-tooltip' }
        );

        layer.on({
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({ weight: 3, color: '#1f241a', fillOpacity: 0.8 });
            l.bringToFront();
          },
          mouseout: (e) => {
            geoLayer.resetStyle(e.target);
          },
          click: () => {
            setSelectedWard({
              ward_number: p.ward_number,
              ward_name: p.ward_name,
              count,
              tier,
              breakdown: categoryBreakdown[p.ward_number] || {}
            });
          }
        });
      }
    }).addTo(mapRef.current);

    geojsonLayerRef.current = geoLayer;
  }, [wardCounts, selectedWard, language]);

  // Update Pulsing Heat Markers
  useEffect(() => {
    if (!mapRef.current) return;

    if (heatMarkersLayerRef.current) {
      mapRef.current.removeLayer(heatMarkersLayerRef.current);
    }

    if (!showHotspots) return;

    const layerGroup = L.layerGroup();

    (wardsData.features || []).forEach(f => {
      const wNum = f.properties.ward_number;
      const count = wardCounts[wNum] || 0;
      if (count < 4) return; // Only show heat pulses on high/critical density wards

      const geom = f.geometry;
      const ring = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0][0];
      const mid = ring[Math.floor(ring.length / 2)];
      if (!mid) return;

      const lat = mid[1];
      const lng = mid[0];
      const color = count >= 6 ? '#dc2626' : '#ea580c';
      const radius = count >= 6 ? 30 : 22;

      const circle = L.circleMarker([lat, lng], {
        radius,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.45
      });

      circle.bindPopup(`
        <div style="font-family: inherit; font-size: 0.85rem; color: #1f241a; padding: 4px;">
          <div style="font-weight: 800; color: ${color}; text-transform: uppercase;">🔥 Critical Concentration</div>
          <div style="font-weight: 700; margin: 4px 0;">Ward ${wNum} - ${f.properties.ward_name}</div>
          <div>Active Reports: <strong>${count}</strong></div>
        </div>
      `);

      layerGroup.addLayer(circle);
    });

    layerGroup.addTo(mapRef.current);
    heatMarkersLayerRef.current = layerGroup;
  }, [wardCounts, showHotspots]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner & Density Metrics in Royal Light Gold & Olive */}
      <div className="card" style={{ padding: '18px 22px', backgroundColor: '#ffffff', border: '1.5px solid #e5dcbe', boxShadow: '0 2px 8px rgba(75, 94, 40, 0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5e28', fontWeight: 800, fontSize: '1.15rem' }}>
              <Flame size={20} color="#b38328" />
              <span>{t('heatmap_title')}</span>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#5e6654', margin: '4px 0 0 0' }}>
              {t('heatmap_desc')}
            </p>
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#5e6654', fontWeight: 700 }}>Filter Layer:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="form-select"
              style={{ padding: '6px 12px', fontSize: '0.84rem', width: 'auto', backgroundColor: '#ffffff', borderColor: '#dcd3b8', color: '#1f241a' }}
            >
              <option value="all">All Civic Issues</option>
              <option value="Garbage / Waste">Garbage / Waste</option>
              <option value="Pothole / Road Damage">Potholes & Roads</option>
              <option value="Streetlight Failure">Streetlight Failure</option>
              <option value="Water Leakage">Water Pipeline Leaks</option>
            </select>
          </div>
        </div>

        {/* 4 Density Legend Counters */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginTop: '16px',
          paddingTop: '14px',
          borderTop: '1.5px solid #e8dfc9'
        }}>
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: 700 }}>{t('critical_density')}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#dc2626' }}>{criticalCount} Wards</div>
          </div>

          <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fdba74', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ fontSize: '0.72rem', color: '#9a3412', fontWeight: 700 }}>{t('high_density')}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ea580c' }}>{highCount} Wards</div>
          </div>

          <div style={{ backgroundColor: '#fefce8', border: '1px solid #fde047', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ fontSize: '0.72rem', color: '#854d0e', fontWeight: 700 }}>{t('moderate_density')}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ca8a04' }}>{moderateCount} Wards</div>
          </div>

          <div style={{ backgroundColor: '#edf7e7', border: '1px solid #b8df9c', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ fontSize: '0.72rem', color: '#275214', fontWeight: 700 }}>{t('low_density')}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#4b5e28' }}>{lowCount} Wards</div>
          </div>
        </div>
      </div>

      {/* Map & Inspector Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedWard ? '1fr 290px' : '1fr', gap: '16px' }}>
        {/* Map Container */}
        <div style={{
          height: '460px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1.5px solid #e5dcbe',
          position: 'relative',
          boxShadow: '0 4px 15px rgba(75, 94, 40, 0.10)'
        }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

          {/* Toggle Overlay Controls in Royal Light Gold */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            backgroundColor: 'rgba(253, 249, 238, 0.95)',
            border: '1.5px solid #dcd3b8',
            backdropFilter: 'blur(8px)',
            borderRadius: '8px',
            padding: '8px 14px',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            fontSize: '0.8rem',
            color: '#1f241a',
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={showHotspots} 
                onChange={(e) => setShowHotspots(e.target.checked)} 
              />
              <span>Pulse Heat Clusters</span>
            </label>
          </div>
        </div>

        {/* Selected Ward Inspector Drawer in Royal Light Gold & Olive */}
        {selectedWard && (
          <div className="card" style={{ padding: '18px', backgroundColor: '#ffffff', border: '1.5px solid #e5dcbe', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(75, 94, 40, 0.08)' }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 800,
                backgroundColor: getDensityColor(selectedWard.count),
                color: '#ffffff',
                marginBottom: '10px'
              }}>
                {selectedWard.tier}
              </div>

              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1f241a', margin: '0 0 4px 0' }}>
                Ward {selectedWard.ward_number}
              </h4>
              <div style={{ fontSize: '0.88rem', color: '#4b5e28', fontWeight: 700, marginBottom: '16px' }}>
                {selectedWard.ward_name}
              </div>

              <div style={{ backgroundColor: '#fcfaf4', padding: '12px', borderRadius: '8px', border: '1px solid #e8dfc9', marginBottom: '14px' }}>
                <div style={{ fontSize: '0.72rem', color: '#5e6654', textTransform: 'uppercase', fontWeight: 800 }}>
                  Active Grievances
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: getDensityColor(selectedWard.count) }}>
                  {selectedWard.count} Reports
                </div>
              </div>

              {/* Category Breakdown */}
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#5e6654', textTransform: 'uppercase', marginBottom: '8px' }}>
                Issue Breakdown:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {Object.entries(selectedWard.breakdown).length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#5e6654' }}>No unresolved reports.</div>
                ) : (
                  Object.entries(selectedWard.breakdown).map(([cat, cnt]) => (
                    <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#4a5040', padding: '4px 0', borderBottom: '1px solid #f1ebd8' }}>
                      <span>{cat}</span>
                      <strong style={{ color: '#b38328' }}>{cnt}</strong>
                    </div>
                  ))
                )}
              </div>
            </div>

            {onSelectWard && (
              <button
                onClick={() => onSelectWard(selectedWard.ward_number)}
                className="btn btn-olive"
                style={{ width: '100%', padding: '10px', fontSize: '0.84rem', marginTop: '16px', backgroundColor: '#4b5e28', color: '#ffffff' }}
              >
                <Eye size={15} /> Filter Directory for Ward {selectedWard.ward_number}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
