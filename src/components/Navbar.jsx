import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Building2, 
  MapPin, 
  FileText, 
  Search, 
  Info, 
  LogIn, 
  LogOut, 
  ShieldAlert, 
  CheckSquare, 
  BarChart3, 
  Menu, 
  X, 
  ChevronRight, 
  PhoneCall, 
  Languages 
} from 'lucide-react';

export default function Navbar({ activePage, setActivePage }) {
  const { user, logout, isAdmin, isOfficer, isCorporator } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNav = (page) => {
    setActivePage(page);
    setDrawerOpen(false);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
      }
    };
    if (drawerOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [drawerOpen]);

  const getDashboardPage = () => {
    if (!user) return 'login';
    if (user.role === 'admin') return 'admin-dashboard';
    if (user.role === 'field_officer') return 'officer-dashboard';
    if (user.role === 'corporator') return 'corporator-dashboard';
    return 'home';
  };

  const navItems = [
    {
      id: 'home',
      label: t('home'),
      icon: Building2,
      desc: language === 'kn' ? 'ನಗರದ ಅವಲೋಕನ ಮತ್ತು ಅಂಕಿಅಂಶಗಳು' : 'City overview, statistics & highlights'
    },
    {
      id: 'map',
      label: t('public_map'),
      icon: MapPin,
      desc: language === 'kn' ? '೬೫ ವಾರ್ಡ್‌ಗಳ ನೇರ ಜಿಐಎಸ್ ನಕ್ಷೆ' : '65-Ward interactive GIS & health scores'
    },
    {
      id: 'file-complaint',
      label: t('file_complaint'),
      icon: FileText,
      desc: language === 'kn' ? 'ಫೋಟೋ ಮತ್ತು ಜಿಪಿಎಸ್ ಮೂಲಕ ದೂರು ಸಲ್ಲಿಸಿ' : 'Report civic issues with photo & GPS',
      highlight: true
    },
    {
      id: 'track',
      label: t('track_issue'),
      icon: Search,
      desc: language === 'kn' ? 'ಲೈವ್ ಸ್ಥಿತಿ, ಡೈರೆಕ್ಟರಿ ಮತ್ತು ಹೀಟ್‌ಮ್ಯಾಪ್' : 'Track live status, directory & heat map'
    },
    {
      id: 'about',
      label: t('about'),
      icon: Info,
      desc: language === 'kn' ? 'ಪಾಲಿಕೆ ನಿಯಮಗಳು ಮತ್ತು ಎಸ್.ಎಲ್.ಎ' : 'MCC governance, SLA targets & rules'
    }
  ];

  return (
    <>
      <header style={{
        backgroundColor: '#fbf7ee',
        borderBottom: '1.5px solid #e6dcbe',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 10px rgba(75, 94, 40, 0.06)'
      }}>
        {/* Top Govt Bar in Royal Light Gold */}
        <div style={{
          backgroundColor: '#f3eddc',
          color: '#4a5040',
          fontSize: '0.75rem',
          padding: '6px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e4dac0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#b38328', fontWeight: 800 }}>{t('mcc_kannada')}</span>
            <span>•</span>
            <span style={{ fontWeight: 600 }}>{t('mcc_title')}</span>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>{t('emergency_helpline')}</span>
            <span style={{ color: '#4b5e28', fontWeight: 700 }}>{t('wards_tag')}</span>
          </div>
        </div>

        {/* Main Nav in Royal Light Gold & Olive Accents */}
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '70px' }}>
          {/* Brand */}
          <div 
            onClick={() => handleNav('home')} 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4b5e28 0%, #b38328 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '1.15rem',
              boxShadow: '0 3px 8px rgba(75, 94, 40, 0.3)',
              border: '1.5px solid #d4af37'
            }}>
              MCC
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#1f241a', letterSpacing: '-0.02em' }}>
                {t('mcc_title')}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#5e6654', fontWeight: 600 }}>
                {t('portal_tag')}
              </div>
            </div>
          </div>

          {/* Right Area: Language Switcher + Staff Login + Three-Line Drawer Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Quick Kannada / English Language Switcher (Left of Staff Login) */}
            <button
              onClick={toggleLanguage}
              title={language === 'en' ? 'ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಿ (Switch to Kannada)' : 'Switch to English'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 13px',
                borderRadius: '8px',
                border: '1.5px solid #4b5e28',
                backgroundColor: '#f1f6ea',
                color: '#3c4e1f',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 4px rgba(75, 94, 40, 0.12)'
              }}
            >
              <Languages size={16} />
              <span>{t('switch_lang')}</span>
            </button>

            {/* User status or Staff Login */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Clickable User Pill */}
                <button
                  onClick={() => handleNav(getDashboardPage())}
                  title={user.isOwner ? 'Website Owner & Chief Commissioner' : 'Go to My Dashboard'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: user.isOwner ? '#fefce8' : '#edf4e4',
                    borderRadius: '8px',
                    border: user.isOwner ? '1.5px solid #d4af37' : '1.5px solid #4b5e28',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: user.isOwner ? '#715511' : '#2d3a17',
                    cursor: 'pointer',
                    boxShadow: user.isOwner ? '0 1px 4px rgba(212, 175, 55, 0.25)' : '0 1px 3px rgba(75, 94, 40, 0.1)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '0.9rem' }}>
                    {user.isOwner ? '👑' : (user.role === 'admin' ? '🏛️' : (user.role === 'corporator' ? '🏛️' : '🛠️'))}
                  </span>
                  <span>{user.isOwner ? 'Hemanth' : user.name.split(' ')[0]}</span>
                  <span style={{
                    fontSize: '0.70rem',
                    backgroundColor: user.isOwner ? '#d4af37' : '#4b5e28',
                    color: '#ffffff',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 800,
                    textTransform: 'uppercase'
                  }}>
                    {user.isOwner ? 'Owner' : (user.role === 'admin' ? 'Admin' : (user.role === 'corporator' ? 'Corp' : 'Staff'))}
                  </span>
                </button>

                {/* Direct Dashboard Button */}
                <button
                  onClick={() => handleNav(getDashboardPage())}
                  className="btn btn-olive"
                  title="Open Staff Dashboard"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '7px 12px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    backgroundColor: '#4b5e28',
                    color: '#ffffff'
                  }}
                >
                  <BarChart3 size={14} />
                  <span>{t('dashboard')}</span>
                </button>

                {/* Logout Button */}
                <button 
                  onClick={logout}
                  className="btn btn-outline"
                  title="Logout"
                  style={{
                    padding: '7px 10px',
                    fontSize: '0.8rem',
                    color: '#b91c1c',
                    borderColor: '#fca5a5',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => handleNav('login')}
                className="btn btn-olive"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  backgroundColor: '#4b5e28',
                  color: '#ffffff'
                }}
              >
                <LogIn size={15} /> {t('staff_login')}
              </button>
            )}

            {/* Three lines drawer toggle button */}
            <button 
              onClick={() => setDrawerOpen(true)}
              aria-label="Open Navigation Drawer"
              className="btn btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 13px',
                fontSize: '0.86rem',
                fontWeight: 700,
                color: '#262d1f',
                backgroundColor: '#ffffff',
                border: '1.5px solid #d8cdb2',
                boxShadow: '0 1px 4px rgba(75, 94, 40, 0.08)'
              }}
            >
              <Menu size={19} strokeWidth={2.4} />
              <span>{t('menu')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Slide-in Navigation Drawer Backdrop */}
      {drawerOpen && (
        <div 
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(38, 45, 31, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 199,
            transition: 'opacity 0.25s ease'
          }}
        />
      )}

      {/* Right Slide-in Drawer Panel in Royal Light Gold & Olive */}
      <aside 
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '340px',
          maxWidth: '85vw',
          backgroundColor: '#faf6ed',
          borderLeft: '1.5px solid #e4dac0',
          boxShadow: '-6px 0 25px rgba(75, 94, 40, 0.15)',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          overflowY: 'auto',
          color: '#1f241a'
        }}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e6dcbe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f3eddc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #4b5e28, #b38328)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: '1rem',
              border: '1px solid #d4af37'
            }}>
              MCC
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#1f241a' }}>
                {t('menu')}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#5e6654' }}>
                {t('mcc_title')}
              </div>
            </div>
          </div>

          <button 
            onClick={() => setDrawerOpen(false)}
            aria-label="Close Navigation Drawer"
            className="btn btn-outline"
            style={{
              width: '36px',
              height: '36px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              color: '#5e6654',
              borderColor: '#dcd3b8'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Content */}
        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Public Services Section */}
          <div>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#6e7762',
              marginBottom: '10px',
              paddingLeft: '6px'
            }}>
              {language === 'kn' ? 'ನಾಗರಿಕ ಸೇವೆಗಳು' : 'Citizen Services'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      textAlign: 'left',
                      backgroundColor: isActive 
                        ? (item.highlight ? '#edf4e4' : '#f0f5e8')
                        : '#ffffff',
                      border: isActive
                        ? (item.highlight ? '1.5px solid #4b5e28' : '1.5px solid #556b2f')
                        : '1px solid #e8dfc8',
                      boxShadow: isActive ? '0 2px 8px rgba(75, 94, 40, 0.12)' : '0 1px 3px rgba(0,0,0,0.03)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: isActive 
                          ? (item.highlight ? '#4b5e28' : '#556b2f')
                          : '#f5efe0',
                        color: isActive ? '#ffffff' : '#4b5e28',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <div style={{
                          fontSize: '0.92rem',
                          fontWeight: isActive ? 800 : 700,
                          color: isActive 
                            ? (item.highlight ? '#36481e' : '#36481e')
                            : '#1f241a'
                        }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#5e6654', marginTop: '1px' }}>
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} color={isActive ? '#4b5e28' : '#94a088'} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Authenticated Staff Links Section */}
          {user && (
            <div>
              <div style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#6e7762',
                marginBottom: '10px',
                paddingLeft: '6px'
              }}>
                {language === 'kn' ? 'ಸಿಬ್ಬಂದಿ ನಿರ್ವಹಣೆ' : 'Staff Management'}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleNav('admin-dashboard')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        backgroundColor: activePage === 'admin-dashboard' ? '#edf4e4' : '#ffffff',
                        border: activePage === 'admin-dashboard' ? '1.5px solid #4b5e28' : '1px solid #e8dfc8',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ShieldAlert size={18} color="#4b5e28" />
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1f241a' }}>
                            {language === 'kn' ? 'ಅಡ್ಮಿನ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್' : 'Admin Dashboard'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#5e6654' }}>
                            {language === 'kn' ? 'ನಗರ ಉಸ್ತುವಾರಿ & ವಿಶ್ಲೇಷಣೆ' : 'City overview & analytics'}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={16} color="#6e7762" />
                    </button>

                    <button
                      onClick={() => handleNav('verification-queue')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        backgroundColor: activePage === 'verification-queue' ? '#edf4e4' : '#ffffff',
                        border: activePage === 'verification-queue' ? '1.5px solid #4b5e28' : '1px solid #e8dfc8',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CheckSquare size={18} color="#4b5e28" />
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1f241a' }}>
                            {language === 'kn' ? 'ಪರಿಶೀಲನಾ ಸರದಿ' : 'Verification Queue'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#5e6654' }}>
                            {language === 'kn' ? 'ಕ್ಷೇತ್ರ ಪರಿಹಾರಗಳನ್ನು ಅನುಮೋದಿಸಿ' : 'Approve field resolutions'}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={16} color="#6e7762" />
                    </button>
                  </>
                )}

                {isOfficer && (
                  <button
                    onClick={() => handleNav('officer-dashboard')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      backgroundColor: activePage === 'officer-dashboard' ? '#edf4e4' : '#ffffff',
                      border: activePage === 'officer-dashboard' ? '1.5px solid #4b5e28' : '1px solid #e8dfc8',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckSquare size={18} color="#4b5e28" />
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1f241a' }}>
                          {language === 'kn' ? 'ಕ್ಷೇತ್ರ ಅಧಿಕಾರಿ ಮಂಡಳಿ' : 'Officer Dispatch Board'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#5e6654' }}>
                          {language === 'kn' ? 'ಇಲಾಖಾ ದುರಸ್ತಿ & ಜಿಪಿಎಸ್ ಸಾಕ್ಷಿ' : 'Department repairs & GPS evidence'}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} color="#6e7762" />
                  </button>
                )}

                {isCorporator && (
                  <button
                    onClick={() => handleNav('corporator-dashboard')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      backgroundColor: activePage === 'corporator-dashboard' ? '#edf4e4' : '#ffffff',
                      border: activePage === 'corporator-dashboard' ? '1.5px solid #4b5e28' : '1px solid #e8dfc8',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <BarChart3 size={18} color="#b38328" />
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1f241a' }}>
                          {language === 'kn' ? 'ಕಾರ್ಪೊರೇಟರ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್' : 'Ward Corporator Dashboard'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#5e6654' }}>
                          {language === 'kn' ? 'ವಾರ್ಡ್ ಆರೋಗ್ಯ ಸ್ಕೋರ್ & ಎಚ್ಚರಿಕೆಗಳು' : 'Ward health scores & notifications'}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} color="#6e7762" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #e6dcbe',
          backgroundColor: '#f3eddc',
          fontSize: '0.78rem',
          color: '#5e6654'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b38328', fontWeight: 700, marginBottom: '4px' }}>
            <PhoneCall size={14} /> {t('control_room')}
          </div>
          <div>{t('portal_tag')}</div>
        </div>
      </aside>
    </>
  );
}
