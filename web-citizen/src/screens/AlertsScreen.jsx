import { useState, useEffect } from 'react';

const SEVERITY_COLORS = {
  LOW: { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' },
  MODERATE: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  HIGH: { bg: '#FFEDD5', text: '#9A3412', border: '#FED7AA' },
  CRITICAL: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
  SEVERE: { bg: '#FECACA', text: '#7C2D12', border: '#FCA5A5' },
};

export default function AlertsScreen({ alerts: initialAlerts }) {
  const [alerts, setAlerts] = useState(initialAlerts || []);
  const [filter, setFilter] = useState('all');

  useEffect(() => { setAlerts(initialAlerts || []); }, [initialAlerts]);

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.severity === filter);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Active Alerts
        </h2>
        <span className="panel-badge">{filtered.length} alerts</span>
      </div>
      <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['all', 'SEVERE', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`nav-link ${filter === f ? 'active' : ''}`} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>
      <div className="alerts-list">
        {filtered.length === 0 && (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <p>No alerts match this filter.</p>
          </div>
        )}
        {filtered.map((alert, i) => (
          <div key={i} className="alert-card" style={{ borderLeft: `4px solid ${SEVERITY_COLORS[alert.severity]?.text || '#64748B'}` }}>
            <div className="alert-card-header">
              <div className="alert-card-title">
                <span className="region-risk-badge" style={{ background: SEVERITY_COLORS[alert.severity]?.bg, color: SEVERITY_COLORS[alert.severity]?.text }}>
                  {alert.severity}
                </span>
                {alert.alert_type}
              </div>
              <div className="alert-time">{new Date(alert.created_at).toLocaleString()}</div>
            </div>
            <div className="alert-card-region">Region: {alert.region_id}</div>
            <div className="alert-card-reason">{alert.reason}</div>
            <div className="alert-card-footer">
              <span>Risk:</span> {alert.risk_level} &nbsp;|&nbsp;
              <span>Rainfall:</span> {alert.rainfall_mm}mm &nbsp;|&nbsp;
              <span>Soil:</span> {alert.soil_saturation}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
