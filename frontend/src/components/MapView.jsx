import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Fix Leaflet's default icon paths in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Category Colors
const CATEGORY_COLORS = {
  'Garbage / Waste': '#e11d48',
  'Pothole / Road Damage': '#f59e0b',
  'Streetlight Failure': '#8b5cf6',
  'Water Leakage': '#0284c7'
};

export default function MapView({
  center = [12.2958, 76.6394],
  zoom = 13,
  wardGeoJson = null,
  hotspots = [],
  complaints = [],
  draggableMarker = null,
  onMarkerDragEnd = null,
  onMapClick = null,
  onWardSelect = null,
  selectedWardNumber = null,
  height = '500px'
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const geojsonLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const hotspotsLayerRef = useRef(null);
  const pinMarkerRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors | Mysuru City Corporation'
    }).addTo(map);

    if (onMapClick) {
      map.on('click', (e) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Wards GeoJSON Layer
  useEffect(() => {
    if (!mapRef.current || !wardGeoJson) return;

    if (geojsonLayerRef.current) {
      mapRef.current.removeLayer(geojsonLayerRef.current);
    }

    const layer = L.geoJSON(wardGeoJson, {
      style: (feature) => {
        const score = feature.properties.health_score ?? 100;
        let fillColor = '#10b981'; // green (excellent)
        if (score < 50) fillColor = '#ef4444'; // red (critical)
        else if (score < 70) fillColor = '#f59e0b'; // orange (average)
        else if (score < 85) fillColor = '#3b82f6'; // blue (good)

        return {
          fillColor: fillColor,
          weight: 1.5,
          opacity: 0.9,
          color: '#1e3a8a',
          fillOpacity: 0.25
        };
      },
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        const popupContent = `
          <div style="font-family: inherit; min-width: 190px;">
            <div style="font-weight: 800; font-size: 0.95rem; color: #1e3a8a; margin-bottom: 4px;">
              Ward ${p.ward_number}: ${p.ward_name}
            </div>
            <div style="font-size: 0.8rem; margin-bottom: 6px;">
              <strong>Civic Health Score:</strong> 
              <span style="font-weight: 700; color: ${p.health_score < 60 ? '#dc2626' : '#16a34a'};">
                ${p.health_score ?? 100} / 100 (${p.rating || 'EXCELLENT'})
              </span>
            </div>
            <div style="font-size: 0.75rem; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 4px;">
              <div>Total Reports: <strong>${p.total_complaints || 0}</strong></div>
              <div>Resolved: <strong style="color: #16a34a;">${p.resolved_count || 0}</strong></div>
              <div>Overdue: <strong style="color: #dc2626;">${p.overdue_count || 0}</strong></div>
            </div>
          </div>
        `;
        layer.bindPopup(popupContent);

        layer.on('click', () => {
          if (onWardSelect) onWardSelect(p);
        });

        layer.on('mouseover', function () {
          this.setStyle({ fillOpacity: 0.45, weight: 2.5 });
        });
        layer.on('mouseout', function () {
          this.setStyle({ fillOpacity: 0.25, weight: 1.5 });
        });
      }
    }).addTo(mapRef.current);

    geojsonLayerRef.current = layer;
  }, [wardGeoJson]);

  // Zoom to selected ward when changed via dropdown
  useEffect(() => {
    if (!mapRef.current || !geojsonLayerRef.current || !selectedWardNumber) return;
    try {
      geojsonLayerRef.current.eachLayer((layer) => {
        if (layer.feature && String(layer.feature.properties?.ward_number) === String(selectedWardNumber)) {
          if (layer.getBounds) {
            mapRef.current.fitBounds(layer.getBounds(), { padding: [60, 60], maxZoom: 15 });
          }
          if (layer.openPopup) {
            layer.openPopup();
          }
        }
      });
    } catch (e) {
      console.warn('Error zooming to ward:', e);
    }
  }, [selectedWardNumber]);

  // Update Hotspots Layer
  useEffect(() => {
    if (!mapRef.current) return;

    if (hotspotsLayerRef.current) {
      mapRef.current.removeLayer(hotspotsLayerRef.current);
    }

    const group = L.layerGroup();

    hotspots.forEach((h) => {
      const circle = L.circle([h.center_lat, h.center_lng], {
        color: '#dc2626',
        fillColor: '#ef4444',
        fillOpacity: 0.35,
        radius: h.radius_m || 200,
        weight: 2,
        dashArray: '4, 4'
      });

      circle.bindPopup(`
        <div style="font-family: inherit;">
          <div style="font-weight: 800; color: #b91c1c; font-size: 0.9rem;">
            🔥 Civic Hotspot Detected
          </div>
          <div style="font-size: 0.8rem; margin: 4px 0;">
            <strong>Category:</strong> ${h.category_name}<br/>
            <strong>Ward:</strong> ${h.ward_name}<br/>
            <strong>Active Complaints:</strong> ${h.complaint_count}
          </div>
          <div style="font-size: 0.72rem; color: #64748b;">
            DBSCAN Spatial Cluster (${Math.round(h.radius_m)}m radius)
          </div>
        </div>
      `);

      group.addLayer(circle);
    });

    group.addTo(mapRef.current);
    hotspotsLayerRef.current = group;
  }, [hotspots]);

  // Update Complaint Markers
  useEffect(() => {
    if (!mapRef.current) return;

    if (markersLayerRef.current) {
      mapRef.current.removeLayer(markersLayerRef.current);
    }

    const group = L.layerGroup();

    complaints.forEach((c) => {
      const color = CATEGORY_COLORS[c.category_name] || '#3b82f6';
      
      const customIcon = L.divIcon({
        className: 'custom-pin',
        html: `
          <div style="
            width: 14px;
            height: 14px;
            background-color: ${color};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 0 4px rgba(0,0,0,0.4);
          "></div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const marker = L.marker([c.latitude, c.longitude], { icon: customIcon });

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 0.82rem;">
          <div style="font-weight: 700; color: #0f172a;">${c.complaint_code}</div>
          <div style="color: ${color}; font-weight: 600;">${c.category_name}</div>
          <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">
            Status: <strong>${c.status}</strong> | Priority: <strong>${c.priority}</strong>
          </div>
        </div>
      `);

      group.addLayer(marker);
    });

    group.addTo(mapRef.current);
    markersLayerRef.current = group;
  }, [complaints]);

  const onMarkerDragEndRef = useRef(onMarkerDragEnd);
  useEffect(() => {
    onMarkerDragEndRef.current = onMarkerDragEnd;
  }, [onMarkerDragEnd]);

  // Draggable Pin for Complaint Filing
  useEffect(() => {
    if (!mapRef.current) return;

    if (draggableMarker && draggableMarker.lat && draggableMarker.lng) {
      if (pinMarkerRef.current) {
        const currentPos = pinMarkerRef.current.getLatLng();
        // Only update marker position if coordinates actually changed by more than ~1 meter
        const dist = Math.abs(currentPos.lat - draggableMarker.lat) + Math.abs(currentPos.lng - draggableMarker.lng);
        if (dist > 0.00001) {
          pinMarkerRef.current.setLatLng([draggableMarker.lat, draggableMarker.lng]);
        }
      } else {
        const marker = L.marker([draggableMarker.lat, draggableMarker.lng], {
          draggable: true,
          autoPan: true
        }).addTo(mapRef.current);

        marker.on('dragend', function (e) {
          const latlng = e.target.getLatLng();
          if (onMarkerDragEndRef.current) {
            onMarkerDragEndRef.current(latlng.lat, latlng.lng);
          }
        });

        marker.bindPopup('<b>Drag to fine-tune exact issue location</b>').openPopup();
        pinMarkerRef.current = marker;
      }
    } else if (pinMarkerRef.current) {
      mapRef.current.removeLayer(pinMarkerRef.current);
      pinMarkerRef.current = null;
    }
  }, [draggableMarker?.lat, draggableMarker?.lng]);

  return (
    <div style={{ height, width: '100%', position: 'relative', overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
