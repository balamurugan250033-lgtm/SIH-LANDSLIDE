import { useState, useEffect } from 'react';

const RISK_COLORS = {
  LOW: '#16A34A',
  MODERATE: '#D97706',
  HIGH: '#EA580C',
  CRITICAL: '#DC2626',
  SEVERE: '#7C2D12',
};

const RISK_BG = {
  LOW: '#DCFCE7',
  MODERATE: '#FEF3C7',
  HIGH: '#FFEDD5',
  CRITICAL: '#FEE2E2',
  SEVERE: '#FECACA',
};

function formatAlertTime(alert) {
  const value = alert.created_at || alert.timestamp || alert.sent_at;
  if (!value || Number.isNaN(Date.parse(value))) return 'Just now';
  return new Date(value).toLocaleString();
}

export default function Dashboard({ stats: initialStats, regions = [], alerts = [], notifications = [], reports = [], setActiveTab }) {
  const [stats, setStats] = useState(initialStats);

  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  const criticalCount = alerts.filter(a => ['CRITICAL', 'SEVERE'].includes(a.severity || a.risk_level)).length;

  const displayStats = stats || {
    total_regions: regions.length,
    total_alerts: alerts.length,
    critical_alerts: criticalCount,
    total_notifications: notifications.length,
    total_reports: reports.length,
    active_users: null,
  };

  const highRiskRegions = regions.filter(r => ['HIGH', 'CRITICAL', 'SEVERE'].includes(r.risk_level));

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('regions')}>
          <div className="stat-header">
            <div className="stat-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <span className="stat-change stat-up">Monitored</span>
          </div>
          <div className="stat-value">{displayStats.total_regions || regions.length}</div>
          <div className="stat-label">NER Regions</div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('alerts')}>
          <div className="stat-header">
            <div className="stat-icon" style={{ background: '#FEF2F2', color: '#DC2626' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <span className="stat-change stat-down" style={{ background: '#FEE2E2', color: '#DC2626' }}>
              {displayStats.critical_alerts || criticalCount} Critical
            </span>
          </div>
          <div className="stat-value">{displayStats.total_alerts || alerts.length}</div>
          <div className="stat-label">Active Warnings</div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('reports')}>
          <div className="stat-header">
            <div className="stat-icon" style={{ background: '#F0FDF4', color: '#16A34A' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
            </div>
            <span className="stat-change stat-up" style={{ background: '#DCFCE7', color: '#16A34A' }}>Ground Intel</span>
          </div>
          <div className="stat-value">{displayStats.total_reports || reports.length}</div>
          <div className="stat-label">Citizen Reports</div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('notifications')}>
          <div className="stat-header">
            <div className="stat-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <span className="stat-change stat-up">Broadcasts</span>
          </div>
          <div className="stat-value">{displayStats.total_notifications || notifications.length}</div>
          <div className="stat-label">Dispatches</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="table-panel">
          <div className="table-header">
            <h3 className="table-title">Live Alert Feed & Dispatches</h3>
            <span className="table-badge">{alerts.length} total</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Region Name</th>
                <th>Trigger Reason</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {alerts.slice(0, 6).map((alert, i) => {
                const level = alert.severity || alert.risk_level || 'MODERATE';
                const region = regions.find(r => r.region_id === alert.region_id || r.id === alert.region_id);
                return (
                  <tr key={alert.id || i}>
                    <td>
                      <span className="badge" style={{ background: RISK_BG[level] || '#F1F5F9', color: RISK_COLORS[level] || '#475569', border: `1px solid ${RISK_COLORS[level]}44`, fontWeight: 700 }}>
                        {level}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{region ? region.name : `Region #${alert.region_id}`}</td>
                    <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {alert.reason || '--'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatAlertTime(alert)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="table-panel">
          <div className="table-header">
            <h3 className="table-title">Priority High-Risk Zones</h3>
            <span className="table-badge" style={{ background: '#FEE2E2', color: '#DC2626' }}>{highRiskRegions.length} alert</span>
          </div>
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {highRiskRegions.map(r => (
              <div key={r.region_id} style={{ padding: '0.85rem', background: '#F8FAFC', borderRadius: '8px', borderLeft: `4px solid ${RISK_COLORS[r.risk_level]}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{r.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Rain: <b>{r.rainfall_mm}mm</b> | Sat: <b>{r.soil_saturation}%</b> | Vib: <b>{r.vibration ? 'Yes' : 'No'}</b>
                  </div>
                </div>
                <span className="badge" style={{ background: RISK_BG[r.risk_level], color: RISK_COLORS[r.risk_level], fontWeight: 700, fontSize: '0.75rem' }}>
                  {r.risk_level}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {reports.length > 0 && (
        <div className="table-panel" style={{ marginBottom: '2rem' }}>
          <div className="table-header">
            <h3 className="table-title">Recent Citizen Incident Reports</h3>
            <button
              onClick={() => setActiveTab('reports')}
              style={{
                background: 'var(--primary-color, #2563EB)',
                color: 'white',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              View All Reports ({reports.length}) →
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Region</th>
                <th>Hazard Type</th>
                <th>Description</th>
                <th>Status</th>
                <th>Reported At</th>
              </tr>
            </thead>
            <tbody>
              {reports.slice(0, 5).map(rep => {
                const reg = regions.find(r => r.region_id === rep.region_id || r.id === rep.region_id);
                const hazards = rep.hazard_types?.length ? rep.hazard_types.join(', ') : (rep.hazard_type || 'General');
                return (
                  <tr key={rep.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary-color)' }}>#REP-{rep.id}</td>
                    <td style={{ fontWeight: 600 }}>{reg ? reg.name : `Region #${rep.region_id}`}</td>
                    <td><span className="badge" style={{ background: '#F1F5F9', color: '#334155' }}>{hazards}</span></td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rep.description}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: rep.status === 'Validated' ? '#DCFCE7' : rep.status === 'Under Review' ? '#FEF3C7' : '#EFF6FF',
                          color: rep.status === 'Validated' ? '#166534' : rep.status === 'Under Review' ? '#92400E' : '#1E40AF',
                          fontWeight: 700,
                        }}
                      >
                        {rep.status || 'Submitted'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatAlertTime(rep)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="ops-overview-grid">
        <section className="ops-panel">
          <div className="ops-panel-head">
            <div><span className="ops-eyebrow">EMERGENCY RESPONSE CENTER</span><h3>Response readiness</h3></div>
            <span className="ops-live"><i /> LIVE OPERATIONS</span>
          </div>
          <div className="ops-metrics">
            <div><strong>--</strong><span>Teams deployed</span></div>
            <div><strong>--</strong><span>Roads closed</span></div>
            <div><strong>{highRiskRegions.length || 0}</strong><span>High-risk regions</span></div>
            <div><strong>{reports.length || 0}</strong><span>Citizen reports</span></div>
            <div><strong>--</strong><span>Sensors offline</span></div>
          </div>
          <div className="ops-pipeline">
            <span>Rain + soil</span><b>→</b><span>AI score</span><b>→</b><span>GIS alert</span><b>→</b><strong>Dispatch</strong>
          </div>
        </section>
        <section className="ops-panel ops-queue-panel">
          <div className="ops-panel-head"><div><span className="ops-eyebrow">PRIORITY RESPONSE QUEUE</span><h3>Needs action now</h3></div><span className="ops-count">{highRiskRegions.length} open</span></div>
          <div className="ops-queue">
            {highRiskRegions.slice(0, 3).map((region) => { const level = region.risk_level || 'HIGH'; return <div className="ops-queue-row" key={region.region_id}><span className={`ops-level ops-level--${level.toLowerCase()}`}>{level}</span><div><strong>{region.name}</strong><small>{region.alert_message || 'Regional risk requires review'}</small></div><button onClick={() => setActiveTab('alerts')}>Review</button></div>; })}
            {!highRiskRegions.length && <div className="ops-empty">No high-risk region is currently returned by the monitoring feed.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
