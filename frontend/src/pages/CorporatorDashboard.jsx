import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ComplaintCard from '../components/ComplaintCard';
import api from '../services/api';
import { BarChart3, Bell, CheckCircle2, AlertTriangle, ShieldCheck, Clock, Activity } from 'lucide-react';

export default function CorporatorDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('complaints'); // complaints | notifications

  useEffect(() => {
    const loadWardData = async () => {
      setLoading(true);
      try {
        const [analyticsRes, complaintsRes, notifsRes] = await Promise.all([
          api.get('/corporator/ward-analytics'),
          api.get('/corporator/complaints'),
          api.get('/corporator/notifications')
        ]);
        setAnalytics(analyticsRes.data);
        setComplaints(complaintsRes.data.complaints || []);
        setNotifications(notifsRes.data.notifications || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadWardData();
  }, []);

  return (
    <div className="container" style={{ padding: '30px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b45309' }}>
            ELECTED REPRESENTATIVE PORTAL
          </span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
            {user?.ward_name ? `Ward ${user?.ward_name}` : 'Ward Corporator Oversight'}
          </h2>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Corporator: <strong>{user?.name}</strong> • Real-Time Civic Health & Alerts
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setActiveTab('complaints')}
            className={`btn ${activeTab === 'complaints' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            Ward Complaints ({complaints.length})
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`btn ${activeTab === 'notifications' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <Bell size={15} /> Alerts ({notifications.length})
          </button>
        </div>
      </div>

      {/* Ward Civic Health Score & Factor Cards */}
      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {/* Main Health Score */}
          <div className="card" style={{ borderLeft: `5px solid ${analytics.health_score < 60 ? '#dc2626' : '#16a34a'}` }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Ward Civic Health Score</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: analytics.health_score < 60 ? '#dc2626' : '#16a34a', margin: '4px 0' }}>
              {analytics.health_score} <span style={{ fontSize: '1rem', fontWeight: 600 }}>/ 100</span>
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: analytics.health_score < 60 ? '#dc2626' : '#16a34a' }}>
              Rating: {analytics.rating}
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Resolution Rate</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a', margin: '4px 0' }}>
              {analytics.factors?.resolution_rate_pct || 0}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {analytics.factors?.resolved_count || 0} of {analytics.factors?.total_complaints || 0} issues resolved
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>SLA Overdue Issues</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: analytics.factors?.overdue_count > 0 ? '#dc2626' : '#16a34a', margin: '4px 0' }}>
              {analytics.factors?.overdue_count || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Requires department escalation
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>High Priority Pending</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b45309', margin: '4px 0' }}>
              {analytics.factors?.high_priority_pending || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Near schools / hospitals / transit
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'complaints' ? (
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
            Ward Civic Issues
          </h3>
          {loading ? (
            <div>Loading complaints...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {complaints.map((c) => (
                <ComplaintCard key={c.id} complaint={c} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
            Corporator Notifications & Alerts
          </h3>
          <div className="card" style={{ padding: '8px' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                No unread notifications for your ward.
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bell size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 500 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
