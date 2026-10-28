import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
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
import { useLanguage } from '../context/LanguageContext';
import { OFFICIAL_STAFF_ACCOUNTS } from '../utils/authValidator';

export default function Login({ setActivePage }) {
  const { user, login, logout } = useAuth();
  const { language, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const routeByRole = (role) => {
    if (role === 'admin') setActivePage('admin-dashboard');
    else if (role === 'field_officer') setActivePage('officer-dashboard');
    else if (role === 'corporator') setActivePage('corporator-dashboard');
    else setActivePage('home');
  };

  const doLogin = async (targetEmail, targetPass) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const loggedUser = await login(targetEmail, targetPass);
      const isOwner = loggedUser.isOwner || loggedUser.email === 'hemanthkm2006@gmail.com';
      const welcomeText = isOwner
        ? (language === 'kn' ? `ಸ್ವಾಗತ ವೆಬ್‌ಸೈಟ್ ಮಾಲೀಕರೇ, ${loggedUser.name}! ಪೂರ್ಣ ಮಾಲೀಕತ್ವ ಪ್ರವೇಶ ಸಕ್ರಿಯಗೊಳಿಸಲಾಗಿದೆ.` : `Welcome Website Owner, ${loggedUser.name}! Full Super Admin & Owner rights active.`)
        : (language === 'kn' ? `ಸ್ವಾಗತ, ${loggedUser.name}! ಲಾಗಿನ್ ಯಶಸ್ವಿಯಾಗಿದೆ. ಭದ್ರತಾ ಮೇಲ್ hemanthkm2006@gmail.com ಗೆ ರವಾನಿಸಲಾಗಿದೆ.` : `Welcome, ${loggedUser.name}! Login verified. Security notification dispatched to hemanthkm2006@gmail.com.`);
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
    <div style={{ backgroundColor: '#faf6ec', minHeight: '100vh', padding: '50px 16px', color: '#1f241a' }}>
      <div className="container" style={{ maxWidth: '640px' }}>

        {/* If user is ALREADY logged in, show clear Active Session state */}
        {user ? (
          <div className="card" style={{
            padding: '32px',
            backgroundColor: '#ffffff',
            borderColor: '#b8c9a3',
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
                  placeholder="e.g. hemanthkm2006@gmail.com, admin@mcc.gov.in, engineer..."
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
              <div style={{ fontSize: '0.74rem', color: '#6e7762', marginTop: '4px' }}>
                {language === 'kn' ? 'ಮಾಲೀಕರು & ಅಡ್ಮಿನ್: hemanth, owner, admin, engineer, swm, elec, water, corporator' : 'Owner & Staff aliases: hemanth, owner, admin, engineer, swm, elec, water, corporator'}
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
              <strong>Security Protocol:</strong> All login authentication alerts and security logs are automatically dispatched to <strong>hemanthkm2006@gmail.com</strong> (Website Owner).
            </div>
          </div>

          {/* 1-Click Instant Login Cards */}
          <div style={{ marginTop: '24px', borderTop: '1.5px solid #e8dfc9', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4b5e28', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {language === 'kn' ? '⚡ ೧-ಕ್ಲಿಕ್ ತ್ವರಿತ ಲಾಗಿನ್ ಖಾತೆಗಳು' : '⚡ 1-Click Instant Staff Access'}
                </span>
                <div style={{ fontSize: '0.74rem', color: '#6e7762', marginTop: '2px' }}>
                  {language === 'kn' ? 'ಯಾವುದೇ ಖಾತೆಯನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ ತಕ್ಷಣ ಲಾಗಿನ್ ಆಗಿ' : 'Click "⚡ Instant" to log in directly to that staff role'}
                </div>
              </div>
            </div>

            {/* List of Pre-Seeded Staff Roles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              {/* WEBSITE OWNER CARD */}
              <div style={{
                padding: '14px 16px',
                background: 'linear-gradient(135deg, #fefce8 0%, #fdf8e1 100%)',
                border: '2px solid #d4af37',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: '0 3px 10px rgba(212, 175, 55, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #d4af37, #8c6b16)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1.15rem',
                    boxShadow: '0 2px 6px rgba(140, 107, 22, 0.3)'
                  }}>
                    👑
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.94rem', fontWeight: 900, color: '#6f5410' }}>
                        Hemanth K M
                      </span>
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        backgroundColor: '#d4af37',
                        color: '#ffffff',
                        padding: '2px 7px',
                        borderRadius: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}>
                        Website Owner
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#5e6654', marginTop: '2px' }}>
                      <strong>hemanthkm2006@gmail.com</strong> • Full Super Admin & Security Dispatch
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleInstantLogin('hemanthkm2006@gmail.com', 'Admin@123')}
                    disabled={loading}
                    className="btn btn-olive"
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      backgroundColor: '#4b5e28',
                      color: '#ffffff',
                      boxShadow: '0 2px 6px rgba(75, 94, 40, 0.25)'
                    }}
                  >
                    ⚡ Instant
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreFill('hemanthkm2006@gmail.com', 'Admin@123')}
                    className="btn btn-outline"
                    style={{
                      padding: '8px 10px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      backgroundColor: '#ffffff',
                      borderColor: '#d4af37',
                      color: '#6f5410'
                    }}
                  >
                    Fill
                  </button>
                </div>
              </div>

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
                color: '#6e7762',
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
                    <div style={{ fontSize: '0.70rem', color: '#6e7762', marginTop: '2px' }}>
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
                    <div style={{ fontSize: '0.70rem', color: '#6e7762', marginTop: '2px' }}>
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
                    <div style={{ fontSize: '0.70rem', color: '#6e7762', marginTop: '2px' }}>
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
                    <div style={{ fontSize: '0.70rem', color: '#6e7762', marginTop: '2px' }}>
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

              {/* Elected Corporators */}
              <div style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#6e7762',
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
                    <div style={{ fontSize: '0.70rem', color: '#6e7762', marginTop: '2px' }}>
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
                    <div style={{ fontSize: '0.70rem', color: '#6e7762', marginTop: '2px' }}>
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
