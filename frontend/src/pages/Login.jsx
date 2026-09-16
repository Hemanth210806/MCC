import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Login({ setActivePage }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const user = await login(email, password);
      if (user.role === 'admin') setActivePage('admin-dashboard');
      else if (user.role === 'field_officer') setActivePage('officer-dashboard');
      else if (user.role === 'corporator') setActivePage('corporator-dashboard');
      else setActivePage('home');
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="container" style={{ padding: '60px 20px', maxWidth: '520px' }}>
      <div className="card" style={{ padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            backgroundColor: '#dbeafe',
            color: '#1e3a8a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto'
          }}>
            <Lock size={26} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
            Staff Access Portal
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Mysuru City Corporation Official Authentication
          </p>
        </div>

        {errorMsg && (
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Official Email</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="email"
                required
                className="form-input"
                placeholder="name@mcc.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password"
              required
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '1rem', marginTop: '6px' }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        {/* 1-Click Demo Credentials Quick Fill */}
        <div style={{ marginTop: '28px', borderTop: '1px solid #e2e8f0', paddingTop: '18px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Demo Fill (1-Click Login):
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              type="button"
              onClick={() => handleQuickLogin('admin@mcc.gov.in', 'Admin@123')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.82rem',
                textAlign: 'left'
              }}
            >
              <div>
                <strong style={{ color: '#1e3a8a' }}>Administrator</strong>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>admin@mcc.gov.in</div>
              </div>
              <span className="badge badge-ASSIGNED" style={{ fontSize: '0.65rem' }}>Admin</span>
            </button>

            {/* 4 Department Field Officers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button 
                type="button"
                onClick={() => handleQuickLogin('roads.officer@mcc.gov.in', 'Officer@123')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '8px 10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  textAlign: 'left'
                }}
              >
                <strong style={{ color: '#0d9488' }}>🛣️ Roads & Potholes</strong>
                <div style={{ fontSize: '0.70rem', color: '#64748b' }}>roads.officer@mcc.gov.in</div>
              </button>

              <button 
                type="button"
                onClick={() => handleQuickLogin('swm.officer@mcc.gov.in', 'Officer@123')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '8px 10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  textAlign: 'left'
                }}
              >
                <strong style={{ color: '#16a34a' }}>🗑️ Waste / SWM</strong>
                <div style={{ fontSize: '0.70rem', color: '#64748b' }}>swm.officer@mcc.gov.in</div>
              </button>

              <button 
                type="button"
                onClick={() => handleQuickLogin('elec.officer@mcc.gov.in', 'Officer@123')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '8px 10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  textAlign: 'left'
                }}
              >
                <strong style={{ color: '#d97706' }}>💡 Streetlights</strong>
                <div style={{ fontSize: '0.70rem', color: '#64748b' }}>elec.officer@mcc.gov.in</div>
              </button>

              <button 
                type="button"
                onClick={() => handleQuickLogin('water.officer@mcc.gov.in', 'Officer@123')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '8px 10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  textAlign: 'left'
                }}
              >
                <strong style={{ color: '#0284c7' }}>🚰 Water Leakage</strong>
                <div style={{ fontSize: '0.70rem', color: '#64748b' }}>water.officer@mcc.gov.in</div>
              </button>
            </div>

            <button 
              type="button"
              onClick={() => handleQuickLogin('ward1.corporator@mcc.gov.in', 'Corporator@123')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.82rem',
                textAlign: 'left'
              }}
            >
              <div>
                <strong style={{ color: '#b45309' }}>Corporator (Ward 1 Hebballu – Lakshmikantha Nagara)</strong>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>ward1.corporator@mcc.gov.in</div>
              </div>
              <span className="badge badge-VERIFICATION_PENDING" style={{ fontSize: '0.65rem' }}>Corporator</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
