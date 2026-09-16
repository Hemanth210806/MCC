import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
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
  Bell, 
  Menu, 
  X,
  User as UserIcon 
} from 'lucide-react';

export default function Navbar({ activePage, setActivePage }) {
  const { user, logout, isAdmin, isOfficer, isCorporator } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (page) => {
    setActivePage(page);
    setMobileOpen(false);
  };

  return (
    <header style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      {/* Top Govt Bar */}
      <div style={{
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        fontSize: '0.75rem',
        padding: '6px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#fbbf24', fontWeight: 700 }}>ಮೈಸೂರು ಮಹಾನಗರ ಪಾಲಿಕೆ</span>
          <span>•</span>
          <span>Mysuru City Corporation (MCC) Portal</span>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Emergency Helpline: 0821-2440890</span>
          <span>Civic AI Online</span>
        </div>
      </div>

      {/* Main Nav */}
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
            background: 'linear-gradient(135deg, #1e3a8a, #0d9488)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: '1.2rem',
            boxShadow: '0 4px 6px rgba(30, 58, 138, 0.2)'
          }}>
            MCC
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#1e3a8a', letterSpacing: '-0.02em' }}>
              Mysuru Civic Connect
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
              AI-Powered Civic Issue Monitoring & SLA System
            </div>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }} className="desktop-nav">
          {/* Public items */}
          <button 
            onClick={() => handleNav('home')}
            className={`btn ${activePage === 'home' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            Home
          </button>
          <button 
            onClick={() => handleNav('map')}
            className={`btn ${activePage === 'map' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <MapPin size={16} /> Public Map
          </button>
          <button 
            onClick={() => handleNav('file-complaint')}
            className={`btn ${activePage === 'file-complaint' ? 'btn-gold' : 'btn-outline'}`}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <FileText size={16} /> File Complaint
          </button>
          <button 
            onClick={() => handleNav('track')}
            className={`btn ${activePage === 'track' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <Search size={16} /> Track Issue
          </button>
          <button 
            onClick={() => handleNav('about')}
            className={`btn ${activePage === 'about' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <Info size={16} /> About
          </button>

          {/* Role specific links */}
          {isAdmin && (
            <>
              <div style={{ height: '24px', width: '1px', backgroundColor: '#cbd5e1', margin: '0 4px' }} />
              <button 
                onClick={() => handleNav('admin-dashboard')}
                className={`btn ${activePage === 'admin-dashboard' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                <ShieldAlert size={16} /> Admin
              </button>
              <button 
                onClick={() => handleNav('verification-queue')}
                className={`btn ${activePage === 'verification-queue' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                <CheckSquare size={16} /> Verify Queue
              </button>
            </>
          )}

          {isOfficer && (
            <>
              <div style={{ height: '24px', width: '1px', backgroundColor: '#cbd5e1', margin: '0 4px' }} />
              <button 
                onClick={() => handleNav('officer-dashboard')}
                className={`btn ${activePage === 'officer-dashboard' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                <CheckSquare size={16} /> Officer Queue
              </button>
            </>
          )}

          {isCorporator && (
            <>
              <div style={{ height: '24px', width: '1px', backgroundColor: '#cbd5e1', margin: '0 4px' }} />
              <button 
                onClick={() => handleNav('corporator-dashboard')}
                className={`btn ${activePage === 'corporator-dashboard' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                <BarChart3 size={16} /> Ward Dashboard
              </button>
            </>
          )}

          {/* Login / User Status */}
          <div style={{ marginLeft: '10px' }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                  {user.name.split(' ')[0]} ({user.role})
                </span>
                <button 
                  onClick={logout}
                  className="btn btn-outline"
                  title="Logout"
                  style={{ padding: '6px 10px', fontSize: '0.8rem', color: '#dc2626' }}
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => handleNav('login')}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <LogIn size={15} /> Staff Login
              </button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
