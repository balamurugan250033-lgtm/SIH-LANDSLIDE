import { useState, useEffect } from 'react';
import { createAlert } from '../api';

const SEVERITY_LEVELS = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'SEVERE'];
const RISK_COLORS = { LOW: '#16A34A', MODERATE: '#D97706', HIGH: '#EA580C', CRITICAL: '#DC2626', SEVERE: '#7C2D12' };
const RISK_BG = { LOW: '#DCFCE7', MODERATE: '#FEF3C7', HIGH: '#FFEDD5', CRITICAL: '#FEE2E2', SEVERE: '#FECACA' };

function formatAlertTime(alert) {
  const value = alert.created_at || alert.timestamp || alert.sent_at;
  if (!value || Number.isNaN(Date.parse(value))) return 'Just now';
  return new Date(value).toLocaleString();
}

export default function AlertManagement({ alerts: initialAlerts, regions = [], onRefresh, token }) {
  const [alerts, setAlerts] = useState(initialAlerts || []);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    region_id: '',
    severity: 'HIGH',
    alert_type: 'LANDSLIDE_WARNING',
    reason: '',
    risk_level: 'HIGH',
    rainfall_mm: '120',
    soil_saturation: '85',
    vibration: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAlerts(initialAlerts || []);
  }, [initialAlerts]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await createAlert({
        ...form,
        rainfall_mm: parseFloat(form.rainfall_mm) || 0,
        soil_saturation: parseFloat(form.soil_saturation) || 0,
      }, token);
      setShowModal(false);
      setForm({
        region_id: '',
        severity: 'HIGH',
        alert_type: 'LANDSLIDE_WARNING',
        reason: '',
        risk_level: 'HIGH',
        rainfall_mm: '120',
        soil_saturation: '85',
        vibration: false,
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="table-panel">
        <div className="table-header">
          <h3 className="table-title">Issued Early Warning Alerts</h3>
          <div className="table-actions">
            <button
              className="btn btn-danger"
              onClick={() => setShowModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', background: '#DC2626', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Broadcast Official Alert
            </button>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Category</th>
              <th>Target Region</th>
              <th>Trigger Reason</th>
              <th>Telemetry Snapshot</th>
              <th>Dispatched Time</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert, i) => {
              const level = alert.severity || alert.risk_level || 'MODERATE';
              const reg = regions.find(r => r.region_id === alert.region_id || r.id === alert.region_id);
              return (
                <tr key={alert.id || i}>
                  <td>
                    <span className="badge" style={{ background: RISK_BG[level] || '#F1F5F9', color: RISK_COLORS[level] || '#475569', border: `1px solid ${RISK_COLORS[level]}44`, fontWeight: 700 }}>
                      {level}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{alert.alert_type}</td>
                  <td>{reg ? reg.name : `Region #${alert.region_id}`}</td>
                  <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {alert.reason}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Rain: <b>{alert.rainfall_mm ?? '--'}mm</b> | Sat: <b>{alert.soil_saturation ?? '--'}%</b>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatAlertTime(alert)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '540px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 className="modal-title" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#DC2626' }}>Create & Dispatch Live Alert</h3>
              <button className="modal-close" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Target Zone *</label>
                <select className="form-input" value={form.region_id} onChange={e => setForm({ ...form, region_id: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }} required>
                  <option value="">Select target region...</option>
                  {regions.map(r => <option key={r.region_id} value={r.region_id}>{r.name}</option>)}
                </select>
              </div>
              <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Severity Level *</label>
                  <select className="form-input" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value, risk_level: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    {SEVERITY_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Alert Type *</label>
                  <select className="form-input" value={form.alert_type} onChange={e => setForm({ ...form, alert_type: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <option value="LANDSLIDE_WARNING">Landslide Warning</option>
                    <option value="EVACUATION">Evacuation Order</option>
                    <option value="HEAVY_RAIN">Heavy Downpour Alert</option>
                    <option value="EARTHQUAKE">Seismic Vibration Hazard</option>
                    <option value="FLOOD_WARNING">Flash Flood Advisory</option>
                    <option value="ALL_CLEAR">All Clear Notification</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Trigger Reason / Action Required *</label>
                <textarea className="form-textarea" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Excessive pore pressure detected. Evacuate roadside slopes immediately." style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', minHeight: 70 }} required />
              </div>
              <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Rainfall (mm)</label>
                  <input className="form-input" type="number" step="any" value={form.rainfall_mm} onChange={e => setForm({ ...form, rainfall_mm: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Soil Saturation (%)</label>
                  <input className="form-input" type="number" step="any" value={form.soil_saturation} onChange={e => setForm({ ...form, soil_saturation: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }} />
                </div>
              </div>
              <button type="submit" className="btn btn-danger" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: '#DC2626', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }} disabled={saving}>
                {saving ? 'Transmitting Alert...' : 'Dispatch Alert to All Citizens'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
