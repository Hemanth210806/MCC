import React from 'react';
import { Building2, Shield, Cpu, Map, Award, CheckCircle } from 'lucide-react';

export default function About() {
  return (
    <div className="container" style={{ padding: '50px 20px', maxWidth: '900px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a', letterSpacing: '0.05em' }}>
          PROJECT SPECIFICATION & ARCHITECTURE
        </span>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
          Mysuru Civic Connect (MCC)
        </h2>
        <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: '680px', margin: '10px auto 0 auto' }}>
          AI-Powered Civic Issue Reporting, Monitoring and Resolution System for Mysuru City Corporation.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Card 1: Executive Overview */}
        <div className="card">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={20} /> About Mysuru City Corporation
          </h3>
          <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6 }}>
            Mysuru City Corporation (MCC) administers Karnataka’s cultural capital across <strong>65 administrative municipal wards</strong>, spanning heritage zones, bustling commercial districts, and expanding residential layouts. MCC Civic Connect provides an end-to-end autonomous civic reporting framework connecting citizens directly with operational field officers and elected corporators.
          </p>
        </div>

        {/* Card 2: Core Engineering Pillars */}
        <div className="card">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={20} /> Technical Highlights & Innovations
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>65 Verified GIS Wards</div>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Authentic municipal polygon boundaries with Shapely point-in-polygon lookup and out-of-boundary protection.
              </p>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Deep Learning Vision</div>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                MobileNetV2 transfer learning CNN trained on real public datasets for garbage, potholes, streetlights, and water leakage.
              </p>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Rules Priority Engine</div>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Weights engine factoring proximity to schools, hospitals, transit hubs, and nearby report density with full explainability.
              </p>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Geotagged Verification</div>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Haversine distance calculation comparing original report GPS vs resolution proof, reviewed and verified by Admin.
              </p>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>DBSCAN Hotspots</div>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Density-based spatial clustering to automatically uncover localized civic problem clusters and recurring infrastructure failures.
              </p>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Civic Health Scoring</div>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                0-100 Ward Civic Health Score factoring resolution rate, overdue violations, and pending critical tasks.
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Technology Stack */}
        <div className="card">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '12px' }}>
            Technology Stack
          </h3>
          <ul style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li><strong>Frontend:</strong> React.js, Vite, Leaflet.js, OpenStreetMap, Lucide React, Vanilla CSS Design System</li>
            <li><strong>Backend:</strong> Python 3.11, Flask Application Factory, Blueprints, SQLAlchemy ORM</li>
            <li><strong>Database:</strong> MySQL / SQLite with complete relational schema & seed data</li>
            <li><strong>AI / Computer Vision:</strong> TensorFlow / Keras (MobileNetV2 Transfer Learning), OpenCV, Kaggle API integration</li>
            <li><strong>GIS & Spatial Analytics:</strong> Shapely, scikit-learn (DBSCAN Clustering), GeoJSON standard</li>
            <li><strong>Authentication:</strong> JSON Web Tokens (JWT), bcrypt password hashing, Role-Based Access Control (RBAC)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
