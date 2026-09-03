import { useState, useEffect } from 'react';
import { createAlert, fetchAlerts } from '../api';

const SEVERITY_LEVELS = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'SEVERE'];
const RISK_COLORS = { LOW: '#16A34A', MODERATE: '#D97706', HIGH: '#EA580C', CRITICAL: '#DC2626', SEVERE: '#7C2D12' };

function formatAlertTime(alert) {
  const value = alert.timestamp || alert.created_at;
  if (!value || Number.isNaN(Date.parse(value))) return '--';
  return new Date(value).toLocaleString();
}

export default function AlertManagement({ alerts: initialAlerts, regions, onRefresh, token }) {
  const [alerts, setAlerts] = useState(initialAlerts || []);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ region_id: '', severity: 'MODERATE', alert_type: 'LANDSLIDE_WARNING', reason: '', risk_level: 'MODERATE', rainfall_mm: '', soil_saturation: '', vibration: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => { setAlerts(initialAlerts || []); }, [initialAlerts]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await createAlert({ ...form, rainfall_mm: parseFloat(form.rainfall_mm) || 0, soil_saturation: parseFloat(form.soil_saturation) || 0 }, token);
      setShowModal(false);
      setForm({ region_id: '', severity: 'MODERATE', alert_type: 'LANDSLIDE_WARNING', reason: '', risk_level: 'MODERATE', rainfall_mm: '', soil_saturation: '', vibration: false });
      onRefresh();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div className="table-panel">
        <div className="table-header">
          <h3 className="table-title">All Alerts</h3>
          <div className="table-actions">
            <button className="btn btn-danger" onClick={() => setShowModal(true)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Create Alert</button>
          </div>
        </div>
        <table className="data-table">
          <thead><tr><th>Severity</th><th>Type</th><th>Region</th><th>Risk</th><th>Reason</th><th>Time</th></tr></thead>
          <tbody>
            {alerts.map((alert, i) => (
              <tr key={i}>
                <td><span className="badge" style={{ background: `${RISK_COLORS[alert.severity] || '#F1F5F9'}22`, color: RISK_COLORS[alert.severity] || '#475569' }}>{alert.severity}</span></td>
                <td>{alert.alert_type}</td>
                <td>{alert.region_id}</td>
                <td>{alert.risk_level}</td>
                <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.reason}</td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatAlertTime(alert)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Alert</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Region *</label>
                <select className="form-input" value={form.region_id} onChange={e => setForm({ ...form, region_id: e.target.value })} required>
                  <option value="">Select region...</option>
                  {regions.map(r => <option key={r.region_id} value={r.region_id}>{r.name}</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Severity *</label>
                  <select className="form-input" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value, risk_level: e.target.value })}>
                    {SEVERITY_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Alert Type *</label>
                  <select className="form-input" value={form.alert_type} onChange={e => setForm({ ...form, alert_type: e.target.value })}>
                    <option value="LANDSLIDE_WARNING">Landslide Warning</option>
                    <option value="HEAVY_RAIN">Heavy Rain</option>
                    <option value="EARTHQUAKE">Earthquake</option>
                    <option value="FLOOD_WARNING">Flood Warning</option>
                    <option value="EVACUATION">Evacuation</option>
                    <option value="ALL_CLEAR">All Clear</option>
                  </select>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Reason *</label><textarea className="form-textarea" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required /></div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Rainfall (mm)</label><input className="form-input" type="number" step="any" value={form.rainfall_mm} onChange={e => setForm({ ...form, rainfall_mm: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Soil Saturation (%)</label><input className="form-input" type="number" step="any" value={form.soil_saturation} onChange={e => setForm({ ...form, soil_saturation: e.target.value })} /></div>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="vibration" checked={form.vibration} onChange={e => setForm({ ...form, vibration: e.target.checked })} />
                <label htmlFor="vibration" className="form-label" style={{ marginBottom: 0 }}>Vibration Detected</label>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} disabled={saving}>
                {saving ? 'Creating...' : 'Create Alert'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
