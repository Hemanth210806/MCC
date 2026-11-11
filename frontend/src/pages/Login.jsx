import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import { 
  Lock, 
  Mail, 
  ShieldAlert, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Eye, 
  EyeOff, 
  UserCheck, 
  Building2, 
  Zap, 
  Compass, 
  LogOut,
  ChevronRight,
  Shield
} from 'lucide-react';

const ALL_65_WARDS = [
  [1, "Hebbalu Lakshmikanthanagar"], [2, "Manchegowdanakoppalu"], [3, "Madeshwaranagara Badavane"], [4, "Hebbalu Lokanayakananagar"], [5, "Kumbarakoppalu"],
  [6, "Gokulam,Brudhavana"], [7, "Metagali"], [8, "Bannimantapa Hudco Badavane"], [9, "Kesare"], [10, "Rajivanagara"],
  [11, "Shanthinagara 1"], [12, "Shanthinagara 2"], [13, "Udayagiri"], [14, "Sathyanagara"], [15, "Rajendranagara"],
  [16, "Subashnagara"], [17, "Bannimantapa"], [18, "Yadavagiri"], [19, "Jayalakshmipuram,V.V.Mohalla"], [20, "Vijayanagara 1St & 2Nd Stage"],
  [21, "Gangothri Ward"], [22, "Padavarahalli_Vontikoppal"], [23, "Subbarayanakere"], [24, "Mandi Mohalla"], [25, "Thilaknagara"],
  [26, "Meenabazaar"], [27, "Yeraganahalli"], [28, "Gandhinagara"], [29, "N R_Mohalla"], [30, "Kyathamaranahalli"],
  [31, "K N Pura & Gousianagara"], [32, "Gousianagara Ablock,Usmaniya Block"], [33, "Ajizsait Nagara"], [34, "Kalyanagiri"], [35, "Sathgallai Badavane 1St Stage"],
  [36, "Yaraganahalli, Ambedkar Colony"], [37, "Ragavendra Nagara"], [38, "Giriyabovipallya"], [39, "Gathripuram 1St Stage"], [40, "Lashkar Mohalla"],
  [41, "Devarajamohalla"], [42, "K G Koppal"], [43, "Tk_Layout"], [44, "Janathanagara"], [45, "Sharadadevinagara"],
  [46, "Dattagalli"], [47, "Kuvempu Nagara"], [48, "Jayanagara"], [49, "Lakshmipuram"], [50, "Sunnadakeri"],
  [51, "Agrahara"], [52, "Ittigegudu"], [53, "Kurubarahalli"], [54, "Gunduraonagara"], [55, "Chamundipuram"],
  [56, "Krishnamurthipuram"], [57, "Kuvempu Nagara C I T B"], [58, "Ramakrishnanagara"], [59, "Kuvempu Nagara M Block"], [60, "Ashokapuram"],
  [61, "Vidyaranyapuram"], [62, "Vishweshwaranagara"], [63, "J P Nagara"], [64, "Aravindanagara"], [65, "Srirampura"]
];

export default function Login({ setActivePage }) {
  const { user, login, logout } = useAuth();
  const { language, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 65 Ward Workers Directory State
  const [wardDirectory, setWardDirectory] = useState([]);
  const [selectedWardNumber, setSelectedWardNumber] = useState(47); // Default to Ward 47: Kuvempu Nagara
  const [selectedDeptSlug, setSelectedDeptSlug] = useState('road');

  useEffect(() => {
    let isMounted = true;
    api.get('/auth/ward-directory-workers')
      .then(res => {
        if (isMounted && res.data?.wards && res.data.wards.length > 0) {
          setWardDirectory(res.data.wards);
        }
      })
      .catch(err => {
        console.warn('Could not load ward workers directory:', err);
      });
    return () => { isMounted = false; };
  }, []);

  const routeByRole = (role) => {
    if (role === 'admin') setActivePage('admin-dashboard');
    else if (role === 'field_officer') setActivePage('officer-dashboard');
    else if (role === 'ward_worker') setActivePage('worker-dashboard');
    else if (role === 'corporator') setActivePage('corporator-dashboard');
    else setActivePage('home');
  };

  const doLogin = async (targetEmail, targetPass) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const loggedUser = await login(targetEmail, targetPass);
      const welcomeText = language === 'kn'
        ? `ಸ್ವಾಗತ, ${loggedUser.name}! ಲಾಗಿನ್ ಯಶಸ್ವಿಯಾಗಿದೆ.`
        : `Welcome, ${loggedUser.name}! Login verified successfully.`;
      setSuccessMsg(welcomeText);
      setTimeout(() => {
        routeByRole(loggedUser.role);
      }, 450);
    } catch (err) {
      const msg = err.response?.data?.error || (language === 'kn' ? 'ತಪ್ಪಾದ ಇಮೇಲ್ ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್. ದಯವಿಟ್ಟು ಡೆಮೊ ಖಾತೆ ಬಳಸಿ.' : 'Invalid email or password. Please use official MCC credentials.');
      setErrorMsg(msg);
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    doLogin(email, password);
  };

  const handlePreFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg('');
  };

  const handleInstantLogin = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    doLogin(demoEmail, demoPass);
  };

  return (
    <div style={{ backgroundColor: '#fbf7ee', minHeight: '100vh', padding: '50px 16px', color: '#1f241a' }}>
      <div className="container" style={{ maxWidth: '640px' }}>

        {/* If user is ALREADY logged in, show clear Active Session state */}
        {user ? (
          <div className="card" style={{
            padding: '32px',
            backgroundColor: '#ffffff',
            borderColor: '#b8df9c',
            boxShadow: '0 6px 24px rgba(75, 94, 40, 0.12)',
            marginBottom: '28px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: '#edf4e4',
                color: '#4b5e28',
                border: '2px solid #4b5e28',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <UserCheck size={28} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#4b5e28', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {t('active_session')}
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1f241a', margin: '2px 0' }}>
                  {user.name}
                </h3>
                <div style={{ fontSize: '0.84rem', color: '#5e6654', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>{user.email}</span>
                  <span>•</span>
                  <strong style={{ color: '#b38328' }}>{user.department_name || (user.ward_name ? `Ward: ${user.ward_name}` : user.role)}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => routeByRole(user.role)}
                className="btn btn-olive"
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  fontSize: '0.94rem',
                  fontWeight: 800,
                  backgroundColor: '#4b5e28',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>{t('go_to_dashboard')}</span>
                <ArrowRight size={16} />
              </button>

              <button
                onClick={logout}
                className="btn btn-outline"
                style={{
                  padding: '12px 18px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  borderColor: '#fca5a5',
                  color: '#b91c1c',
                  backgroundColor: '#fff'
                }}
              >
                <LogOut size={16} /> {t('switch_account')}
              </button>
            </div>
          </div>
        ) : null}

        {/* Main Login Form Card */}
        <div className="card" style={{
          padding: '36px',
          backgroundColor: '#ffffff',
          borderColor: '#e5dcbe',
          boxShadow: '0 4px 24px rgba(75, 94, 40, 0.08)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '26px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #4b5e28, #b38328)',
              color: '#ffffff',
              border: '2px solid #d4af37',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto',
              boxShadow: '0 4px 12px rgba(75, 94, 40, 0.25)'
            }}>
              <Lock size={28} />
            </div>
            <h2 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#1f241a', letterSpacing: '-0.02em' }}>
              {t('staff_portal_title')}
            </h2>
            <p style={{ color: '#5e6654', fontSize: '0.86rem', marginTop: '4px' }}>
              {t('staff_portal_desc')}
            </p>
          </div>

          {/* Success Banner */}
          {successMsg && (
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1.5px solid #86efac',
              color: '#166534',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 600,
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={18} color="#16a34a" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1.5px solid #fca5a5',
              color: '#b91c1c',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '0.86rem',
              fontWeight: 600,
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShieldAlert size={18} color="#dc2626" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ color: '#3f4738', fontWeight: 700, fontSize: '0.85rem' }}>
                {language === 'kn' ? 'ಅಧಿಕೃತ ಇಮೇಲ್ ಅಥವಾ ಸಿಬ್ಬಂದಿ ಗುರುತು (ID / Alias)' : 'Official Email / Staff ID'}
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. admin@mcc.gov.in, engineer..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    padding: '12px 14px',
                    fontSize: '0.94rem',
                    borderRadius: '8px',
                    borderColor: '#dcd1b5'
                  }}
                />
              </div>
              <div style={{ fontSize: '0.74rem', color: '#5e6654', marginTop: '4px', lineHeight: '1.4' }}>
                {language === 'kn' 
                  ? 'ಸಿಬ್ಬಂದಿ ಲಾಗಿನ್: hemanth, admin, engineer, swm, elec, water ಅಥವಾ ವಾರ್ಡ್ ವರ್ಕರ್ ಗುರುತು (ಉದಾ: ittigegudu_road, kuvempunagara_waste, 9805202001)' 
                  : 'Accepted: Email, Staff ID, Aliases (admin, engineer, swm, elec, water), or Ward Worker usernames (e.g. ittigegudu_road, kuvempunagara_waste, 9805202001)'}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ color: '#3f4738', fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>
                  {language === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್' : 'Password'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.76rem',
                    color: '#4b5e28',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 700
                  }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{showPassword ? (language === 'kn' ? 'ಮರೆಮಾಡಿ' : 'Hide') : (language === 'kn' ? 'ತೋರಿಸಿ' : 'Show')}</span>
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    padding: '12px 14px',
                    fontSize: '0.94rem',
                    borderRadius: '8px',
                    borderColor: '#dcd1b5'
                  }}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="btn btn-olive"
              style={{
                width: '100%',
                padding: '13px',
                fontSize: '1rem',
                fontWeight: 800,
                backgroundColor: '#4b5e28',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(75, 94, 40, 0.2)'
              }}
            >
              {loading 
                ? (language === 'kn' ? 'ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...' : 'Authenticating...') 
                : (language === 'kn' ? 'ಪೋರ್ಟಲ್‌ಗೆ ಸೈನ್ ಇನ್ ಮಾಡಿ' : 'Sign In to Portal')}
            </button>
          </form>

          {/* Security Email Dispatch Notice */}
          <div style={{
            marginTop: '20px',
            padding: '10px 14px',
            backgroundColor: '#fbf7ed',
            border: '1px solid #d4af37',
            borderRadius: '8px',
            fontSize: '0.76rem',
            color: '#634e14',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Shield size={16} color="#b38328" style={{ flexShrink: 0 }} />
            <div>
              <strong>Security Protocol:</strong> Login authentication alerts and security logs are recorded by the MCC system.
            </div>
          </div>

          {/* 1-Click Instant Login Cards */}
          <div style={{ marginTop: '24px', borderTop: '1.5px solid #e8dfc9', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4b5e28', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {language === 'kn' ? '⚡ ೧-ಕ್ಲಿಕ್ ತ್ವರಿತ ಲಾಗಿನ್ ಖಾತೆಗಳು' : '⚡ 1-Click Instant Staff Access'}
                </span>
                <div style={{ fontSize: '0.74rem', color: '#5e6654', marginTop: '2px' }}>
                  {language === 'kn' ? 'ಯಾವುದೇ ಖಾತೆಯನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ ತಕ್ಷಣ ಲಾಗಿನ್ ಆಗಿ' : 'Click "⚡ Instant" to log in directly to that staff role'}
                </div>
              </div>
            </div>

            {/* List of Pre-Seeded Staff Roles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              {/* Central Administrator Card */}
              <div style={{
                padding: '12px 14px',
                backgroundColor: '#fbf8f0',
                border: '1.5px solid #d4af37',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: '0 1px 4px rgba(212, 175, 55, 0.12)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#d4af37',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.9rem'
                  }}>
                    🏛️
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#8c6b16' }}>
                      MCC Central Administrator
                    </div>
                    <div style={{ fontSize: '0.73rem', color: '#5e6654' }}>
                      admin@mcc.gov.in • City oversight & verification
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleInstantLogin('admin@mcc.gov.in', 'Admin@123')}
                    disabled={loading}
                    className="btn btn-olive"
                    style={{
                      padding: '7px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      backgroundColor: '#4b5e28',
                      color: '#ffffff'
                    }}
                  >
                    ⚡ Instant
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreFill('admin@mcc.gov.in', 'Admin@123')}
                    className="btn btn-outline"
                    style={{
                      padding: '7px 10px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      backgroundColor: '#ffffff',
                      borderColor: '#dcd1b5',
                      color: '#4b5e28'
                    }}
                  >
                    Fill
                  </button>
                </div>
              </div>

              {/* Department Officers Grid */}
              <div style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#5e6654',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginTop: '6px',
                marginBottom: '2px'
              }}>
                {language === 'kn' ? 'ಕ್ಷೇತ್ರ ಇಂಜಿನಿಯರ್‌ಗಳು & ಇಲಾಖಾ ಅಧಿಕಾರಿಗಳು' : 'Department Field Officers & Engineers'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                
                {/* Roads Officer */}
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: '#fcfaf4',
                  border: '1.5px solid #e5dcbe',
                  borderRadius: '9px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#3e4e21', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🛣️</span>
                      <span>Roads & Civil (EE)</span>
                    </div>
                    <div style={{ fontSize: '0.70rem', color: '#5e6654', marginTop: '2px' }}>
                      roads.officer@mcc.gov.in
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleInstantLogin('roads.officer@mcc.gov.in', 'Officer@123')}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        backgroundColor: '#4b5e28',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      ⚡ Instant
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreFill('roads.officer@mcc.gov.in', 'Officer@123')}
                      style={{
                        padding: '6px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                        border: '1px solid #dcd1b5',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#4b5e28'
                      }}
                    >
                      Fill
                    </button>
                  </div>
                </div>

                {/* SWM Officer */}
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: '#fcfaf4',
                  border: '1.5px solid #e5dcbe',
                  borderRadius: '9px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#3e4e21', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🗑️</span>
                      <span>Health & SWM</span>
                    </div>
                    <div style={{ fontSize: '0.70rem', color: '#5e6654', marginTop: '2px' }}>
                      swm.officer@mcc.gov.in
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleInstantLogin('swm.officer@mcc.gov.in', 'Officer@123')}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        backgroundColor: '#4b5e28',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      ⚡ Instant
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreFill('swm.officer@mcc.gov.in', 'Officer@123')}
                      style={{
                        padding: '6px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                        border: '1px solid #dcd1b5',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#4b5e28'
                      }}
                    >
                      Fill
                    </button>
                  </div>
                </div>

                {/* Electrical Officer */}
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: '#fcfaf4',
                  border: '1.5px solid #e5dcbe',
                  borderRadius: '9px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#8c6b16', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>💡</span>
                      <span>Lighting & Elec (AEE)</span>
                    </div>
                    <div style={{ fontSize: '0.70rem', color: '#5e6654', marginTop: '2px' }}>
                      elec.officer@mcc.gov.in
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleInstantLogin('elec.officer@mcc.gov.in', 'Officer@123')}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        backgroundColor: '#4b5e28',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      ⚡ Instant
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreFill('elec.officer@mcc.gov.in', 'Officer@123')}
                      style={{
                        padding: '6px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                        border: '1px solid #dcd1b5',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#4b5e28'
                      }}
                    >
                      Fill
                    </button>
                  </div>
                </div>

                {/* Water Supply Officer */}
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: '#fcfaf4',
                  border: '1.5px solid #e5dcbe',
                  borderRadius: '9px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#8c6b16', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>💧</span>
                      <span>Water & Drainage (AEE)</span>
                    </div>
                    <div style={{ fontSize: '0.70rem', color: '#5e6654', marginTop: '2px' }}>
                      water.officer@mcc.gov.in
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleInstantLogin('water.officer@mcc.gov.in', 'Officer@123')}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        backgroundColor: '#4b5e28',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      ⚡ Instant
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreFill('water.officer@mcc.gov.in', 'Officer@123')}
                      style={{
                        padding: '6px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                        border: '1px solid #dcd1b5',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#4b5e28'
                      }}
                    >
                      Fill
                    </button>
                  </div>
                </div>
              </div>

              {/* Featured & Interactive Ward Department Workers Access */}
              <div style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#5e6654',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginTop: '12px',
                marginBottom: '4px'
              }}>
                {language === 'kn' ? 'ವಾರ್ಡ್ ಇಲಾಖಾ ಸಿಬ್ಬಂದಿ ಲಾಗಿನ್ (ಎಲ್ಲಾ ೬೫ ವಾರ್ಡ್‌ಗಳು)' : 'Ward Department Staff Access (All 65 Wards)'}
              </div>

              {/* 65-Ward Interactive Quick Selector */}
              {(() => {
                const currentWardItem = ALL_65_WARDS.find(w => w[0] === Number(selectedWardNumber)) || ALL_65_WARDS[46];
                const currentWardNum = currentWardItem[0];
                const currentWardName = currentWardItem[1];
                const currentWardSlug = currentWardName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                
                const liveWard = wardDirectory.find(w => w.ward_number === currentWardNum);
                const deptKeyMap = {
                  'waste': 'Solid Waste Management',
                  'road': 'Roads & Infrastructure',
                  'street': 'Electrical & Street Lighting',
                  'water': 'Water Supply & Sewerage'
                };
                const liveWorker = liveWard?.workers?.find(w => w.department_name === deptKeyMap[selectedDeptSlug]);
                const activeWorkerEmail = liveWorker?.email || `${currentWardSlug}_${selectedDeptSlug}@mcc.gov.in`;
                const activeWorkerName = liveWorker?.name || `${currentWardName} Worker`;
                const activeWorkerPhone = liveWorker?.phone || `98${String(currentWardNum).padStart(3, '0')}01001`;

                return (
                  <div style={{
                    padding: '14px 16px',
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #b8df9c',
                    borderRadius: '10px',
                    boxShadow: '0 2px 8px rgba(75, 94, 40, 0.08)',
                    marginBottom: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#4b5e28', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📍</span>
                        <span>{language === 'kn' ? 'ವಾರ್ಡ್ ಆಯ್ಕೆಮಾಡಿ (೧-೬೫)' : 'Select Any Mysuru Ward (1-65)'}</span>
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#68755c', backgroundColor: '#f0f6ea', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                        {language === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್: Worker@123' : 'Password: Worker@123'}
                      </span>
                    </div>

                    {/* Ward Selector Dropdown */}
                    <div>
                      <select
                        value={selectedWardNumber}
                        onChange={(e) => setSelectedWardNumber(Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: '1.5px solid #dcd1b5',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          backgroundColor: '#fbfaf5',
                          color: '#2a331e'
                        }}
                      >
                        {ALL_65_WARDS.map(([wNum, wName]) => (
                          <option key={wNum} value={wNum}>
                            Ward {wNum}: {wName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Department Selector Tabs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {[
                        { slug: 'waste', label: 'Waste', icon: '🗑️' },
                        { slug: 'road', label: 'Roads', icon: '🛣️' },
                        { slug: 'street', label: 'Streetlight', icon: '💡' },
                        { slug: 'water', label: 'Water', icon: '💧' },
                      ].map((dept) => {
                        const isSelected = selectedDeptSlug === dept.slug;
                        return (
                          <button
                            key={dept.slug}
                            type="button"
                            onClick={() => setSelectedDeptSlug(dept.slug)}
                            style={{
                              padding: '8px 4px',
                              borderRadius: '7px',
                              border: isSelected ? '1.5px solid #4b5e28' : '1px solid #dcd1b5',
                              backgroundColor: isSelected ? '#4b5e28' : '#faf7ee',
                              color: isSelected ? '#ffffff' : '#3f4738',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '3px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span>{dept.icon}</span>
                            <span>{dept.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Resolved Worker Profile Box */}
                    <div style={{
                      padding: '10px 12px',
                      backgroundColor: '#fbfaf4',
                      border: '1px solid #e2dabf',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#38481d', wordBreak: 'break-word' }}>
                        {activeWorkerName}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#555e4c', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        <span>Email: <strong style={{ color: '#1f241a' }}>{activeWorkerEmail}</strong></span>
                        <span>•</span>
                        <span>Phone: <strong style={{ color: '#1f241a' }}>{activeWorkerPhone}</strong></span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleInstantLogin(activeWorkerEmail, 'Worker@123')}
                        disabled={loading}
                        className="btn btn-olive"
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          backgroundColor: '#4b5e28',
                          color: '#ffffff',
                          borderRadius: '7px',
                          boxShadow: '0 2px 6px rgba(75, 94, 40, 0.2)'
                        }}
                      >
                        ⚡ {language === 'kn' ? 'ಈ ಖಾತೆಗೆ ತಕ್ಷಣ ಲಾಗಿನ್ ಆಗಿ' : `Instant Login as Ward ${currentWardNum} Worker`}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePreFill(activeWorkerEmail, 'Worker@123')}
                        className="btn btn-outline"
                        style={{
                          padding: '9px 14px',
                          fontSize: '0.80rem',
                          fontWeight: 700,
                          backgroundColor: '#ffffff',
                          borderColor: '#dcd1b5',
                          borderRadius: '7px',
                          color: '#4b5e28'
                        }}
                      >
                        Fill
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Popular Ward Worker Quick Access Grid */}
              <div style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#5e6654',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginTop: '4px',
                marginBottom: '2px'
              }}>
                {language === 'kn' ? 'ತ್ವರಿತ ಪ್ರಮುಖ ವಾರ್ಡ್ ಲಾಗಿನ್‌ಗಳು' : 'Popular Ward Workers Quick Access'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { ward: 'Kuvempu Nagara', slug: 'kuvempu_nagara', dept: 'road', label: 'Pothole & Roads', icon: '🛣️' },
                  { ward: 'Ittigegudu', slug: 'ittigegudu', dept: 'road', label: 'Pothole & Roads', icon: '🛣️' },
                  { ward: 'Agrahara', slug: 'agrahara', dept: 'waste', label: 'Waste Management', icon: '🗑️' },
                  { ward: 'Vidyaranyapuram', slug: 'vidyaranyapuram', dept: 'waste', label: 'Waste Management', icon: '🗑️' },
                ].map((item) => {
                  const accountEmail = `${item.slug}_${item.dept}@mcc.gov.in`;
                  return (
                    <div key={accountEmail} style={{
                      padding: '10px 12px',
                      backgroundColor: '#fcfaf4',
                      border: '1.5px solid #e5dcbe',
                      borderRadius: '9px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#3e4e21', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>{item.icon}</span>
                          <span>{item.ward} {item.label}</span>
                        </div>
                        <div style={{ fontSize: '0.70rem', color: '#5e6654', marginTop: '2px' }}>
                          {accountEmail}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleInstantLogin(accountEmail, 'Worker@123')}
                          disabled={loading}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            backgroundColor: '#4b5e28',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          ⚡ Instant
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePreFill(accountEmail, 'Worker@123')}
                          style={{
                            padding: '6px 8px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            backgroundColor: '#ffffff',
                            border: '1px solid #dcd1b5',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#4b5e28'
                          }}
                        >
                          Fill
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Elected Corporators */}
              <div style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#5e6654',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginTop: '8px',
                marginBottom: '2px'
              }}>
                {language === 'kn' ? 'ಚುನಾಯಿತ ಜನಪ್ರತಿನಿಧಿಗಳು (ಕಾರ್ಪೊರೇಟರ್‌ಗಳು)' : 'Elected Ward Representatives (Corporators)'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: '#fcfaf4',
                  border: '1.5px solid #e5dcbe',
                  borderRadius: '9px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#8c6b16', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🏛️</span>
                      <span>Ward 1 (Agrahara)</span>
                    </div>
                    <div style={{ fontSize: '0.70rem', color: '#5e6654', marginTop: '2px' }}>
                      ward1.corporator@mcc.gov.in
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleInstantLogin('ward1.corporator@mcc.gov.in', 'Corporator@123')}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        backgroundColor: '#b38328',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      ⚡ Instant
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreFill('ward1.corporator@mcc.gov.in', 'Corporator@123')}
                      style={{
                        padding: '6px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                        border: '1px solid #dcd1b5',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#8c6b16'
                      }}
                    >
                      Fill
                    </button>
                  </div>
                </div>

                <div style={{
                  padding: '10px 12px',
                  backgroundColor: '#fcfaf4',
                  border: '1.5px solid #e5dcbe',
                  borderRadius: '9px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#8c6b16', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🏛️</span>
                      <span>Ward 12 (J P Nagar)</span>
                    </div>
                    <div style={{ fontSize: '0.70rem', color: '#5e6654', marginTop: '2px' }}>
                      ward12.corporator@mcc.gov.in
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleInstantLogin('ward12.corporator@mcc.gov.in', 'Corporator@123')}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        backgroundColor: '#b38328',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      ⚡ Instant
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreFill('ward12.corporator@mcc.gov.in', 'Corporator@123')}
                      style={{
                        padding: '6px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                        border: '1px solid #dcd1b5',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#8c6b16'
                      }}
                    >
                      Fill
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
