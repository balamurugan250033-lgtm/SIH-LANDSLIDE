import { useState, useEffect } from 'react';
import { fetchStats, fetchAlerts, fetchNotifications } from '../api';

const RISK_COLORS = { LOW: '#16A34A', MODERATE: '#D97706', HIGH: '#EA580C', CRITICAL: '#DC2626', SEVERE: '#7C2D12' };

function formatAlertTime(alert) {
  const value = alert.timestamp || alert.created_at;
  if (!value || Number.isNaN(Date.parse(value))) return '--';
  return new Date(value).toLocaleString();
}

export default function Dashboard({ stats: initialStats, regions, alerts, notifications }) {
  const [stats, setStats] = useState(initialStats);

  useEffect(() => { setStats(initialStats); }, [initialStats]);

  if (!stats) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading dashboard...</div>;

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <span className="stat-change stat-up">Active</span>
          </div>
          <div className="stat-value">{stats.total_regions || regions.length}</div>
          <div className="stat-label">Total Regions</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ background: '#FEF2F2', color: '#DC2626' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <span className="stat-change stat-down">{stats.critical_alerts || alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'SEVERE').length}</span>
          </div>
          <div className="stat-value">{stats.total_alerts || alerts.length}</div>
          <div className="stat-label">Total Alerts</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <span className="stat-change stat-up">Sent</span>
          </div>
          <div className="stat-value">{stats.total_notifications || notifications.length}</div>
          <div className="stat-label">Notifications Sent</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ background: '#F0FDF4', color: '#16A34A' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
          </div>
          <div className="stat-value">{stats.active_users || '--'}</div>
          <div className="stat-label">Active Users</div>
        </div>
      </div>

      <div className="table-panel" style={{ marginBottom: '2rem' }}>
        <div className="table-header">
          <h3 className="table-title">Recent Alerts</h3>
          <span className="table-badge">{alerts.length}</span>
        </div>
        <table className="data-table">
          <thead><tr><th>Severity</th><th>Type</th><th>Region</th><th>Risk Level</th><th>Time</th></tr></thead>
          <tbody>
            {alerts.slice(0, 5).map((alert, i) => (
              <tr key={i}>
                <td><span className="badge" style={{ background: `${RISK_COLORS[alert.severity] || '#F1F5F9'}22`, color: RISK_COLORS[alert.severity] || '#475569' }}>{alert.severity}</span></td>
                <td>{alert.alert_type}</td>
                <td>{alert.region_id}</td>
                <td>{alert.risk_level}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatAlertTime(alert)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
