import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  MapPin, 
  Search, 
  ShieldCheck, 
  Cpu, 
  Activity, 
  CheckCircle2, 
  TrendingUp, 
  ArrowRight,
  Flame,
  Clock,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function Home({ setActivePage }) {
  const { language, t } = useLanguage();
  const [stats, setStats] = useState({
    totalComplaints: 96,
    resolvedCount: 26,
    resolutionRate: '82.4%',
    activeHotspots: 1,
    wardsCount: 65
  });

  useEffect(() => {
    const fetchPublicStats = async () => {
      try {
        const res = await api.get('/public/map-data');
        if (res.data) {
          const total = res.data.complaint_markers?.length || 96;
          const resolved = res.data.complaint_markers?.filter(c => c.status === 'RESOLVED').length || 26;
          setStats({
            totalComplaints: total,
            resolvedCount: resolved,
            resolutionRate: `${Math.round((resolved / total) * 100)}%`,
            activeHotspots: res.data.hotspots?.length || 1,
            wardsCount: 65
          });
        }
      } catch (err) {
        // use default prefilled
      }
    };
    fetchPublicStats();
  }, []);

  return (
    <div style={{ backgroundColor: '#faf6ec', minHeight: '100vh', color: '#1f241a' }}>
      {/* Hero Banner with Clear Mysuru Palace Full View Photo */}
      <section style={{
        position: 'relative',
        color: '#ffffff',
        padding: '75px 0 85px 0',
        overflow: 'hidden',
        backgroundImage: "url('/images/mysore-palace-full-view.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center 40%',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#faf6ec'
      }}>
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          {/* Transparent container so the palace photo is clear and visible */}
          <div style={{
            maxWidth: '820px',
            backgroundColor: 'transparent',
            padding: '10px 0'
          }}>
            {/* Attribution Tags in Royal Light Gold & Olive */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(253, 249, 238, 0.92)',
                border: '1.5px solid #d4af37',
                color: '#36481e',
                padding: '6px 16px',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 800,
                boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(4px)'
              }}>
                <Cpu size={15} color="#4b5e28" /> {language === 'kn' ? 'ಅಧಿಕೃತ ಎಐ ನಾಗರಿಕ ಪರಿಹಾರ ವ್ಯವಸ್ಥೆ' : 'Official AI Civic Monitoring • Mysuru City Corporation'}
              </div>

              <span style={{
                fontSize: '0.78rem',
                color: '#26311b',
                backgroundColor: 'rgba(253, 249, 238, 0.92)',
                padding: '6px 14px',
                borderRadius: '9999px',
                border: '1.5px solid #b38328',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(4px)'
              }}>
                🏛️ {language === 'kn' ? 'ಮೈಸೂರು ಅರಮನೆ (ಸಂಪೂರ್ಣ ನೋಟ) • ವಾರ್ಡ್ ೫೧ (ಅಗ್ರಹಾರ)' : 'Mysore Palace (Full View) • Ward 51 (Agrahara)'}
              </span>
            </div>

            <h1 style={{
              fontSize: '3.1rem',
              fontWeight: 900,
              lineHeight: 1.15,
              marginBottom: '18px',
              letterSpacing: '-0.02em',
              color: '#ffffff',
              textShadow: '0 3px 14px rgba(0, 0, 0, 0.95), 0 1px 4px rgba(0, 0, 0, 0.95)'
            }}>
              {t('hero_title_1')}<br />
              <span style={{ color: '#fed86c', textShadow: '0 3px 16px rgba(0, 0, 0, 0.95), 0 0 25px rgba(212, 175, 55, 0.55)' }}>
                {t('hero_title_2')}
              </span> {t('hero_title_3')}
            </h1>

            <p style={{
              fontSize: '1.15rem',
              color: '#ffffff',
              marginBottom: '32px',
              lineHeight: 1.6,
              maxWidth: '720px',
              fontWeight: 600,
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.95), 0 1px 3px rgba(0, 0, 0, 0.95)'
            }}>
              {t('hero_desc')}
            </p>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <button 
                type="button"
                onClick={() => setActivePage('file-complaint')}
                className="btn btn-olive"
                style={{
                  padding: '14px 28px',
                  fontSize: '1.02rem',
                  backgroundColor: '#4b5e28',
                  color: '#ffffff',
                  boxShadow: '0 6px 18px rgba(75, 94, 40, 0.45), 0 0 12px rgba(212, 175, 55, 0.4)',
                  fontWeight: 800,
                  border: '1.5px solid #738b47'
                }}
              >
                <FileText size={18} /> {t('report_now')}
              </button>
              <button 
                type="button"
                onClick={() => setActivePage('track')}
                className="btn"
                style={{
                  padding: '14px 24px',
                  fontSize: '1.02rem',
                  color: '#2e3c19',
                  border: '2px solid #556b2f',
                  backgroundColor: 'rgba(253, 249, 238, 0.95)',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                  fontWeight: 700,
                  backdropFilter: 'blur(4px)'
                }}
              >
                <Search size={18} color="#4b5e28" /> {t('track_complaint')}
              </button>
              <button 
                type="button"
                onClick={() => setActivePage('map')}
                className="btn"
                style={{
                  padding: '14px 24px',
                  fontSize: '1.02rem',
                  color: '#3a2d10',
                  border: '2px solid #b38328',
                  backgroundColor: 'rgba(253, 249, 238, 0.95)',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                  fontWeight: 700,
                  backdropFilter: 'blur(4px)'
                }}
              >
                <MapPin size={18} color="#b38328" /> {t('explore_map')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* City Stats Bar in Royal Light Gold & Olive */}
      <section style={{ backgroundColor: '#f5efe1', borderBottom: '1.5px solid #e4dac0', padding: '28px 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1.5px solid #e5dcbe', boxShadow: '0 2px 8px rgba(75, 94, 40, 0.06)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#edf4e4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5e28' }}>
                <Activity size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1f241a' }}>{stats.totalComplaints}</div>
                <div style={{ fontSize: '0.8rem', color: '#5e6654', fontWeight: 700 }}>{t('stat_total')}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1.5px solid #e5dcbe', boxShadow: '0 2px 8px rgba(75, 94, 40, 0.06)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#eaf4e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#386622' }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1f241a' }}>{stats.resolvedCount}</div>
                <div style={{ fontSize: '0.8rem', color: '#5e6654', fontWeight: 700 }}>{t('stat_resolved')}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1.5px solid #e5dcbe', boxShadow: '0 2px 8px rgba(75, 94, 40, 0.06)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fef5e7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b38328' }}>
                <Flame size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1f241a' }}>{stats.activeHotspots}</div>
                <div style={{ fontSize: '0.8rem', color: '#5e6654', fontWeight: 700 }}>{t('stat_hotspots')}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1.5px solid #e5dcbe', boxShadow: '0 2px 8px rgba(75, 94, 40, 0.06)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f7f1e6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8f681a' }}>
                <MapPin size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1f241a' }}>65 Wards</div>
                <div style={{ fontSize: '0.8rem', color: '#5e6654', fontWeight: 700 }}>{t('stat_wards')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Issue Categories */}
      <section style={{ padding: '60px 0' }} className="container">
        <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 40px auto' }}>
          <h2 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#1f241a' }}>
            {t('categories_title')}
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#5e6654', marginTop: '8px', lineHeight: 1.6 }}>
            {t('categories_subtitle')}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          <div className="card" style={{ backgroundColor: '#ffffff', border: '1.5px solid #e5dcbe', borderTop: '4px solid #b91c1c', boxShadow: '0 2px 8px rgba(75, 94, 40, 0.05)' }}>
            <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#b91c1c', marginBottom: '8px' }}>
              🗑️ {language === 'kn' ? 'ಕಸ & ತ್ಯಾಜ್ಯ ವಿಲೇವಾರಿ' : 'Garbage & Waste'}
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#4a5040', marginBottom: '14px', lineHeight: 1.5 }}>
              {language === 'kn' ? 'ತುಂಬಿ ಹರಿಯುವ ಡಸ್ಟ್‌ಬಿನ್‌ಗಳು, ರಸ್ತೆ ಬದಿಯ ಕಸ, ಸಾರ್ವಜನಿಕ ತ್ಯಾಜ್ಯ.' : 'Overflowing dumpsters, roadside trash piles, uncollected commercial waste, and public litter.'}
            </p>
            <div style={{ fontSize: '0.78rem', color: '#5e6654', fontWeight: 700 }}>
              Dept: Solid Waste Management (SWM) • 24h/72h SLA
            </div>
          </div>

          <div className="card" style={{ backgroundColor: '#ffffff', border: '1.5px solid #e5dcbe', borderTop: '4px solid #b38328', boxShadow: '0 2px 8px rgba(75, 94, 40, 0.05)' }}>
            <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#966c1e', marginBottom: '8px' }}>
              🕳️ {language === 'kn' ? 'ರಸ್ತೆ ಗುಂಡಿಗಳು & ಹಾನಿ' : 'Potholes & Road Damage'}
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#4a5040', marginBottom: '14px', lineHeight: 1.5 }}>
              {language === 'kn' ? 'ಅಪಾಯಕಾರಿ ರಸ್ತೆ ಗುಂಡಿಗಳು, ಬಿರುಕುಬಿಟ್ಟ ಡಾಂಬರು, ಕುಸಿದ ಪಾದಚಾರಿ ಮಾರ್ಗಗಳು.' : 'Dangerous road craters, broken asphalt, cave-ins, and uneven surfaces posing accident risks.'}
            </p>
            <div style={{ fontSize: '0.78rem', color: '#5e6654', fontWeight: 700 }}>
              Dept: Roads & Civil Infrastructure • 24h/72h SLA
            </div>
          </div>

          <div className="card" style={{ backgroundColor: '#ffffff', border: '1.5px solid #e5dcbe', borderTop: '4px solid #4b5e28', boxShadow: '0 2px 8px rgba(75, 94, 40, 0.05)' }}>
            <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#4b5e28', marginBottom: '8px' }}>
              💡 {language === 'kn' ? 'ಬೀದಿದೀಪಗಳ ಸಮಸ್ಯೆ' : 'Streetlight Failure'}
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#4a5040', marginBottom: '14px', lineHeight: 1.5 }}>
              {language === 'kn' ? 'ಕೆಲಸ ಮಾಡದ ದೀಪಗಳು, ಹಾನಿಗೊಳಗಾದ ಕಂಬಗಳು, ಅಪಾಯಕಾರಿ ತಂತಿಗಳು.' : 'Non-functioning fixtures, damaged lamp posts, exposed wiring, and dark street stretches.'}
            </p>
            <div style={{ fontSize: '0.78rem', color: '#5e6654', fontWeight: 700 }}>
              Dept: Electrical & Public Lighting • 24h/48h SLA
            </div>
          </div>
        </div>
      </section>

      {/* How MCC Works in Royal Light Gold & Olive Accents */}
      <section style={{ backgroundColor: '#f6f0e2', borderTop: '1.5px solid #e4dac0', borderBottom: '1.5px solid #e4dac0', padding: '60px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 40px auto' }}>
            <h2 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#1f241a' }}>
              {t('how_works_title')}
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#5e6654', marginTop: '8px' }}>
              {t('how_works_subtitle')}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {[
              { step: '01', title: language === 'kn' ? 'ಫೋಟೋ & ಜಿಪಿಎಸ್' : 'Citizen Photo & GPS', desc: language === 'kn' ? 'ನಾಗರಿಕರು ಫೋಟೋ ತೆಗೆದು ಜಿಪಿಎಸ್ ಮೂಲಕ ತಕ್ಷಣ ದೂರು ದಾಖಲಿಸುತ್ತಾರೆ.' : 'Citizen snaps photo and clicks current GPS. No mandatory login required.' },
              { step: '02', title: language === 'kn' ? 'ಎಐ ವರ್ಗೀಕರಣ' : 'AI Classification', desc: language === 'kn' ? 'ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಮಾದರಿಯು ಫೋಟೋವನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ವಿಶ್ಲೇಷಿಸುತ್ತದೆ.' : 'MobileNetV2 CNN analyzes the photo and identifies the civic issue category.' },
              { step: '03', title: language === 'kn' ? 'ವಾರ್ಡ್ & ಆದ್ಯತೆ' : 'Ward & Priority Engine', desc: language === 'kn' ? '೬೫ ವಾರ್ಡ್‌ಗಳ ಜಿಐಎಸ್ ಗಡಿಯೊಳಗೆ ಗುರುತಿಸಿ ಶಾಲೆ/ಆಸ್ಪತ್ರೆ ಸಮೀಪದ ಆದ್ಯತೆ ಲೆಕ್ಕಾಚಾರ.' : 'Point-in-polygon lookup assigns the 65 MCC ward, scores proximity to schools/hospitals.' },
              { step: '04', title: language === 'kn' ? 'ಸ್ವಯಂ ರವಾನೆ & ಕಾಲಮಿತಿ' : 'Auto Routing & SLA', desc: language === 'kn' ? '೨೪ಗಂ ಅಥವಾ ೭೨ಗಂಟೆಗಳ ಪರಿಹಾರ ಗಡುವಿನೊಂದಿಗೆ ಇಲಾಖೆಗೆ ನೇರ ರವಾನೆ.' : 'Dispatched to department queue with 24h, 72h, or 168h target resolution deadline.' },
              { step: '05', title: language === 'kn' ? 'ಜಿಯೋಟ್ಯಾಗ್ ಪರಿಹಾರ' : 'Geotagged Resolution', desc: language === 'kn' ? 'ಅಧಿಕಾರಿಯ ಪರಿಹಾರ ಫೋಟೋ ಮತ್ತು ಜಿಪಿಎಸ್ ಅಂತರ ಪರಿಶೀಲಿಸಿ ದೂರು ಮುಕ್ತಾಯ.' : 'Field officer submits proof photo and GPS. Admin verifies distance before resolving.' }
            ].map((s, idx) => (
              <div key={idx} className="card" style={{ backgroundColor: '#ffffff', border: '1.5px solid #e5dcbe', position: 'relative', boxShadow: '0 2px 8px rgba(75, 94, 40, 0.05)' }}>
                <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#97a884', marginBottom: '6px' }}>
                  {s.step}
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#4b5e28', marginBottom: '6px' }}>
                  {s.title}
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#555d4d', lineHeight: 1.5 }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
