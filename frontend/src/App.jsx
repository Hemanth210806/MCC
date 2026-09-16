import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import PublicMap from './pages/PublicMap';
import FileComplaint from './pages/FileComplaint';
import TrackComplaint from './pages/TrackComplaint';
import About from './pages/About';
import Login from './pages/Login';
import OfficerDashboard from './pages/OfficerDashboard';
import CorporatorDashboard from './pages/CorporatorDashboard';
import AdminDashboard from './pages/AdminDashboard';

function MainApp() {
  const [activePage, setActivePage] = useState('home');
  const { user, isAdmin, isOfficer, isCorporator } = useAuth();

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <Home setActivePage={setActivePage} />;
      case 'map':
        return <PublicMap />;
      case 'file-complaint':
        return <FileComplaint setActivePage={setActivePage} />;
      case 'track':
        return <TrackComplaint />;
      case 'about':
        return <About />;
      case 'login':
        return <Login setActivePage={setActivePage} />;
      case 'officer-dashboard':
        return isOfficer || isAdmin ? <OfficerDashboard /> : <Login setActivePage={setActivePage} />;
      case 'corporator-dashboard':
        return isCorporator || isAdmin ? <CorporatorDashboard /> : <Login setActivePage={setActivePage} />;
      case 'admin-dashboard':
        return isAdmin ? <AdminDashboard initialTab="overview" /> : <Login setActivePage={setActivePage} />;
      case 'verification-queue':
        return isAdmin ? <AdminDashboard initialTab="verification" /> : <Login setActivePage={setActivePage} />;
      default:
        return <Home setActivePage={setActivePage} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar activePage={activePage} setActivePage={setActivePage} />
      <main style={{ flex: 1 }}>
        {renderPage()}
      </main>

      {/* Government Footer */}
      <footer style={{
        backgroundColor: '#0f172a',
        color: '#94a3b8',
        padding: '30px 20px',
        borderTop: '1px solid #1e293b',
        fontSize: '0.82rem'
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem' }}>
              Mysuru City Corporation (MCC)
            </div>
            <div>Sayyaji Rao Road, Agrahara, Mysuru, Karnataka 570024</div>
            <div style={{ marginTop: '4px' }}>AI-Powered Civic Issue Monitoring & Resolution System</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>Public Grievance Redressal Portal</div>
            <div style={{ color: '#fbbf24', marginTop: '2px' }}>65 Verified Municipal Wards</div>
            <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>&copy; 2026 Mysuru City Corporation. All Rights Reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
