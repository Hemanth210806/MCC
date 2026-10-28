import React from 'react';
import { Building2, Shield, Cpu, Map, Award, CheckCircle, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function About() {
  const { language } = useLanguage();

  return (
    <div style={{ backgroundColor: '#faf6ec', minHeight: '100vh', padding: '50px 0', color: '#1f241a' }}>
      <div className="container" style={{ maxWidth: '960px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#edf4e4',
            border: '1.5px solid #4b5e28',
            color: '#36481e',
            padding: '5px 16px',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 800,
            marginBottom: '10px'
          }}>
            <Sparkles size={14} color="#4b5e28" /> {language === 'kn' ? 'ಯೋಜನಾ ವಿವರಣೆ ಮತ್ತು ವಾಸ್ತುಶಿಲ್ಪ' : 'PROJECT SPECIFICATION & ARCHITECTURE'}
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1f241a', marginTop: '6px' }}>
            {language === 'kn' ? 'ಮೈಸೂರು ಮಹಾನಗರ ಪಾಲಿಕೆ (MCC) ಸಿವಿಕ್ ಕನೆಕ್ಟ್' : 'Mysuru Civic Connect (MCC)'}
          </h2>
          <p style={{ color: '#5e6654', fontSize: '1rem', maxWidth: '680px', margin: '10px auto 0 auto', lineHeight: 1.6 }}>
            {language === 'kn' 
              ? 'ಮೈಸೂರು ಮಹಾನಗರ ಪಾಲಿಕೆಗಾಗಿ ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಆಧಾರಿತ ನಾಗರಿಕ ದೂರು ದಾಖಲಾತಿ, ಮೇಲ್ವಿಚಾರಣೆ ಮತ್ತು ತ್ವರಿತ ಪರಿಹಾರ ವೇದಿಕೆ.' 
              : 'AI-Powered Civic Issue Reporting, Monitoring and Resolution System for Mysuru City Corporation.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card 1: Executive Overview */}
          <div className="card" style={{ backgroundColor: '#ffffff', borderColor: '#e5dcbe', boxShadow: '0 2px 8px rgba(75, 94, 40, 0.05)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4b5e28', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} color="#b38328" /> {language === 'kn' ? 'ಮೈಸೂರು ಮಹಾನಗರ ಪಾಲಿಕೆ ಕುರಿತು' : 'About Mysuru City Corporation'}
            </h3>
            <p style={{ fontSize: '0.92rem', color: '#4a5040', lineHeight: 1.6 }}>
              {language === 'kn'
                ? 'ಮೈಸೂರು ಮಹಾನಗರ ಪಾಲಿಕೆಯು ಕರ್ನಾಟಕದ ಸಾಂಸ್ಕೃತಿಕ ರಾಜಧಾನಿಯನ್ನು ೬೫ ಆಡಳಿತಾತ್ಮಕ ಪಾಲಿಕಾ ವಾರ್ಡ್‌ಗಳ ಮೂಲಕ ನಿರ್ವಹಿಸುತ್ತದೆ. ಪಾರಂಪರಿಕ ತಾಣಗಳು, ವಾಣಿಜ್ಯ ಮಾರುಕಟ್ಟೆಗಳು ಮತ್ತು ವಿಶಾಲ ಬಡಾವಣೆಗಳನ್ನು ಒಳಗೊಂಡಿದೆ. ಎಂಸಿಸಿ ಸಿವಿಕ್ ಕನೆಕ್ಟ್ ನಾಗರಿಕರನ್ನು ನೇರವಾಗಿ ಕ್ಷೇತ್ರ ಸಿಬ್ಬಂದಿ ಮತ್ತು ಚುನಾಯಿತ ಕಾರ್ಪೊರೇಟರ್‌ಗಳೊಂದಿಗೆ ಸಂಪರ್ಕಿಸುತ್ತದೆ.'
                : 'Mysuru City Corporation (MCC) administers Karnataka’s cultural capital across 65 administrative municipal wards, spanning heritage zones, bustling commercial districts, and expanding residential layouts. MCC Civic Connect provides an end-to-end autonomous civic reporting framework connecting citizens directly with operational field officers and elected corporators.'}
            </p>
          </div>

          {/* Card 2: Core Engineering Pillars */}
          <div className="card" style={{ backgroundColor: '#ffffff', borderColor: '#e5dcbe', boxShadow: '0 2px 8px rgba(75, 94, 40, 0.05)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4b5e28', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={20} color="#b38328" /> {language === 'kn' ? 'ತಾಂತ್ರಿಕ ಮುಖ್ಯಾಂಶಗಳು & ನಾವೀನ್ಯತೆಗಳು' : 'Technical Highlights & Innovations'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '14px', backgroundColor: '#fcfaf4', borderRadius: '10px', border: '1px solid #e8dfc9' }}>
                <div style={{ fontWeight: 800, color: '#1f241a', marginBottom: '4px' }}>
                  {language === 'kn' ? '೬೫ ಪರಿಶೀಲಿತ ಜಿಐಎಸ್ ವಾರ್ಡ್‌ಗಳು' : '65 Verified GIS Wards'}
                </div>
                <p style={{ fontSize: '0.82rem', color: '#5e6654', lineHeight: 1.5 }}>
                  {language === 'kn' ? 'ಅಧಿಕೃತ ಪಾಲಿಕೆ ಬಹುಭುಜಾಕೃತಿ ಗಡಿಗಳು ಮತ್ತು ಪಾಯಿಂಟ್-ಇನ್-ಪಾಲಿಗಾನ್ ಶೋಧನೆ.' : 'Authentic municipal polygon boundaries with Shapely point-in-polygon lookup and out-of-boundary protection.'}
                </p>
              </div>

              <div style={{ padding: '14px', backgroundColor: '#fcfaf4', borderRadius: '10px', border: '1px solid #e8dfc9' }}>
                <div style={{ fontWeight: 800, color: '#1f241a', marginBottom: '4px' }}>
                  {language === 'kn' ? 'ಡೀಪ್ ಲರ್ನಿಂಗ್ ಕಂಪ್ಯೂಟರ್ ವಿಷನ್' : 'Deep Learning Vision'}
                </div>
                <p style={{ fontSize: '0.82rem', color: '#5e6654', lineHeight: 1.5 }}>
                  {language === 'kn' ? 'ಕಸ, ರಸ್ತೆ ಗುಂಡಿ ಮತ್ತು ಬೀದಿದೀಪ ದೋಷಗಳನ್ನು ತ್ವರಿತವಾಗಿ ಗುರುತಿಸುವ ಎಐ ಮಾದರಿ.' : 'MobileNetV2 transfer learning CNN trained on real public datasets for Garbage_Waste, Pothole, and Streetlight issue detection.'}
                </p>
              </div>

              <div style={{ padding: '14px', backgroundColor: '#fcfaf4', borderRadius: '10px', border: '1px solid #e8dfc9' }}>
                <div style={{ fontWeight: 800, color: '#1f241a', marginBottom: '4px' }}>
                  {language === 'kn' ? 'ನಿಯಮ-ಆಧಾರಿತ ಆದ್ಯತೆ ಎಂಜಿನ್' : 'Rules Priority Engine'}
                </div>
                <p style={{ fontSize: '0.82rem', color: '#5e6654', lineHeight: 1.5 }}>
                  {language === 'kn' ? 'ಶಾಲೆಗಳು, ಆಸ್ಪತ್ರೆಗಳು ಮತ್ತು ಜನದಟ್ಟಣೆಯ ಸಾಮೀಪ್ಯದ ಆಧಾರದ ಮೇಲೆ ಆದ್ಯತೆ ಅಂಕ.' : 'Weights engine factoring proximity to schools, hospitals, transit hubs, and nearby report density with full explainability.'}
                </p>
              </div>

              <div style={{ padding: '14px', backgroundColor: '#fcfaf4', borderRadius: '10px', border: '1px solid #e8dfc9' }}>
                <div style={{ fontWeight: 800, color: '#1f241a', marginBottom: '4px' }}>
                  {language === 'kn' ? 'ಜಿಯೋಟ್ಯಾಗ್ ಪರಿಹಾರ ಪರಿಶೀಲನೆ' : 'Geotagged Verification'}
                </div>
                <p style={{ fontSize: '0.82rem', color: '#5e6654', lineHeight: 1.5 }}>
                  {language === 'kn' ? 'ಮೂಲ ಮತ್ತು ಪರಿಹಾರ ಜಿಪಿಎಸ್ ಅಂತರವನ್ನು ಹ್ಯಾವರ್‌ಸೈನ್ ಸೂತ್ರದ ಮೂಲಕ ತುಲನೆ.' : 'Haversine distance calculation comparing original report GPS vs resolution proof, reviewed and verified by Admin.'}
                </p>
              </div>

              <div style={{ padding: '14px', backgroundColor: '#fcfaf4', borderRadius: '10px', border: '1px solid #e8dfc9' }}>
                <div style={{ fontWeight: 800, color: '#1f241a', marginBottom: '4px' }}>
                  {language === 'kn' ? 'ಡಿಬಿ-ಸ್ಕ್ಯಾನ್ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು' : 'DBSCAN Hotspots'}
                </div>
                <p style={{ fontSize: '0.82rem', color: '#5e6654', lineHeight: 1.5 }}>
                  {language === 'kn' ? 'ಸಾಂದ್ರತೆ ಆಧಾರಿತ ಸ್ಪೇಷಿಯಲ್ ಕ್ಲಸ್ಟರಿಂಗ್ ಮೂಲಕ ಮರುಕಳಿಸುವ ಸಮಸ್ಯೆಗಳ ಪತ್ತೆ.' : 'Density-based spatial clustering to automatically uncover localized civic problem clusters and recurring infrastructure failures.'}
                </p>
              </div>

              <div style={{ padding: '14px', backgroundColor: '#fcfaf4', borderRadius: '10px', border: '1px solid #e8dfc9' }}>
                <div style={{ fontWeight: 800, color: '#1f241a', marginBottom: '4px' }}>
                  {language === 'kn' ? 'ವಾರ್ಡ್ ನಾಗರಿಕ ಆರೋಗ್ಯ ಸೂಚ್ಯಂಕ' : 'Civic Health Scoring'}
                </div>
                <p style={{ fontSize: '0.82rem', color: '#5e6654', lineHeight: 1.5 }}>
                  {language === 'kn' ? '೦-೧೦೦ ಅಂಕಗಳ ವಾರ್ಡ್ ಆರೋಗ್ಯ ಸೂಚ್ಯಂಕವು ಪರಿಹಾರ ದರ ಮತ್ತು ಪಾರದರ್ಶಕತೆ ಬಿಂಬಿಸುತ್ತದೆ.' : '0-100 Ward Civic Health Score factoring resolution rate, overdue violations, and pending critical tasks.'}
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Technology Stack */}
          <div className="card" style={{ backgroundColor: '#ffffff', borderColor: '#e5dcbe', boxShadow: '0 2px 8px rgba(75, 94, 40, 0.05)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b38328', marginBottom: '12px' }}>
              Technology Stack & Municipal Infrastructure
            </h3>
            <ul style={{ fontSize: '0.88rem', color: '#4a5040', lineHeight: 1.8, paddingLeft: '20px' }}>
              <li><strong style={{ color: '#1f241a' }}>Frontend:</strong> React.js, Vite, Leaflet.js, OpenStreetMap CartoDB, Lucide React, Royal Light Gold & Olive Theme</li>
              <li><strong style={{ color: '#1f241a' }}>Bilingual Support:</strong> Instant Kannada & English toggling with persistent state</li>
              <li><strong style={{ color: '#1f241a' }}>Density Visualizer:</strong> Interactive 65-ward GIS choropleth heat map with cluster analysis</li>
              <li><strong style={{ color: '#1f241a' }}>GIS & Spatial Analytics:</strong> Point-in-polygon verification against official Mysuru 65 ward boundaries</li>
              <li><strong style={{ color: '#1f241a' }}>Computer Vision:</strong> Image classification, OCR metadata, and GPS EXIF extractor</li>
              <li><strong style={{ color: '#1f241a' }}>Governance:</strong> Automated SLA timers (24h/72h/168h), corporator escalation, and admin audit gate</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
