import { useState, useEffect } from 'react';

const SEVERITY_COLORS = {
  LOW: { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' },
  MODERATE: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  HIGH: { bg: '#FFEDD5', text: '#9A3412', border: '#FED7AA' },
  CRITICAL: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
  SEVERE: { bg: '#FECACA', text: '#7C2D12', border: '#FCA5A5' },
};

function formatAlertDate(alert) {
  const d = alert?.created_at || alert?.timestamp;
  if (!d || Number.isNaN(Date.parse(d))) return 'Just now';
  return new Date(d).toLocaleString();
}

export default function AlertsScreen({ alerts: initialAlerts, regions = [] }) {
  const [alerts, setAlerts] = useState(initialAlerts || []);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setAlerts(initialAlerts || []);
  }, [initialAlerts]);

  const filtered = filter === 'all'
    ? alerts
    : alerts.filter(a => (a.severity || a.risk_level) === filter);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Active Landslide Alerts & Warnings
        </h2>
        <span className="panel-badge">{filtered.length} active</span>
      </div>
      <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['all', 'SEVERE', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`nav-link ${filter === f ? 'active' : ''}`} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
            {f === 'all' ? 'All Alerts' : f}
          </button>
        ))}
      </div>
      <div className="alerts-list">
        {filtered.length === 0 && (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <p>No active alerts match this severity level.</p>
          </div>
        )}
        {filtered.map((alert, i) => {
          const level = alert.severity || alert.risk_level || 'MODERATE';
          const theme = SEVERITY_COLORS[level] || { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
          return (
            <div key={alert.id || i} className="alert-card" style={{ borderLeft: `4px solid ${theme.text}` }}>
              <div className="alert-card-header">
                <div className="alert-card-title">
                  <span className="region-risk-badge" style={{ background: theme.bg, color: theme.text }}>
                    {level}
                  </span>
                  {alert.alert_type || 'Landslide Warning'}
                </div>
                <div className="alert-time">{formatAlertDate(alert)}</div>
              </div>
              <div className="alert-card-region" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                Zone: {regions.find(r => r.region_id === alert.region_id)?.name || `Region #${alert.region_id}`}
              </div>
              <div className="alert-card-reason">{alert.reason || 'High slope instability and soil saturation detected.'}</div>
              <div className="alert-card-footer">
                <span>Risk Score:</span> {alert.risk_score ? `${(alert.risk_score * 100).toFixed(0)}%` : level} &nbsp;|&nbsp;
                <span>Rainfall:</span> {alert.rainfall_mm ?? '--'}mm &nbsp;|&nbsp;
                <span>Soil Saturation:</span> {alert.soil_saturation ?? '--'}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
