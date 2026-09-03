import { useEffect, useState } from 'react';

const API_BASE = 'http://192.168.1.5:8000/api/v1';

const RISK_LEVELS = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'SEVERE'];
const RISK_COLORS = { LOW: '#16A34A', MODERATE: '#D97706', HIGH: '#EA580C', CRITICAL: '#DC2626', SEVERE: '#7C2D12' };
const RISK_BG = { LOW: '#DCFCE7', MODERATE: '#FEF3C7', HIGH: '#FFEDD5', CRITICAL: '#FEE2E2', SEVERE: '#FECACA' };
const RISK_TEXT = { LOW: '#166534', MODERATE: '#92400E', HIGH: '#9A3412', CRITICAL: '#991B1B', SEVERE: '#7C2D12' };

export default function RegionManagement({ regions: initialRegions, onRefresh, token }) {
  const [regions, setRegions] = useState(initialRegions || []);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', latitude: '', longitude: '', rainfall_mm: '', soil_saturation: '', slope_angle: '', vibration: false, alert_message: '',
  });
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setRegions(initialRegions || []);
    setLastUpdated(new Date());
  }, [initialRegions]);

  async function refreshLiveData() {
    setRefreshing(true);
    try {
      await onRefresh();
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', latitude: '', longitude: '', rainfall_mm: '', soil_saturation: '', slope_angle: '', vibration: false, alert_message: '' });
    setShowModal(true);
  }

  function openEdit(region) {
    setEditing(region);
    setForm({
      name: region.name, latitude: region.latitude, longitude: region.longitude,
      rainfall_mm: region.rainfall_mm, soil_saturation: region.soil_saturation,
      slope_angle: region.slope_angle, vibration: region.vibration, alert_message: region.alert_message || '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `${API_BASE}/admin/regions/${editing.region_id}` : `${API_BASE}/admin/regions`;
      const body = editing
        ? { risk_level: editing.risk_level, ...form, latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude), rainfall_mm: parseFloat(form.rainfall_mm), soil_saturation: parseFloat(form.soil_saturation), slope_angle: parseFloat(form.slope_angle) }
        : { ...form, latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude), rainfall_mm: parseFloat(form.rainfall_mm), soil_saturation: parseFloat(form.soil_saturation), slope_angle: parseFloat(form.slope_angle) };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save region');
      setShowModal(false);
      onRefresh();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(regionId) {
    if (!confirm('Delete this region?')) return;
    const res = await fetch(`${API_BASE}/admin/regions/${regionId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) alert('Failed to delete');
    onRefresh();
  }

  async function updateRiskLevel(region, level) {
    const res = await fetch(`${API_BASE}/admin/regions/${region.region_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...region, risk_level: level }),
    });
    if (res.ok) onRefresh();
  }

  return (
    <div>
      <div className="live-monitor-bar">
        <div className="live-monitor-status"><span className="live-dot" /> Live region monitoring</div>
        <span className="live-monitor-time">Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <button className="btn btn-sm btn-secondary" onClick={refreshLiveData} disabled={refreshing}>
          {refreshing ? 'Refreshing...' : 'Refresh now'}
        </button>
      </div>
      <div className="table-panel">
        <div className="table-header">
          <h3 className="table-title">Regions</h3>
          <div className="table-actions">
            <button className="btn btn-primary" onClick={openCreate}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Region</button>
          </div>
        </div>
        <table className="data-table">
          <thead><tr><th>Name</th><th>Location</th><th>Rain</th><th>Soil</th><th>Slope</th><th>Earthquake Vibration</th><th>Risk</th><th>Actions</th></tr></thead>
          <tbody>
            {regions.map(region => (
              <tr key={region.region_id}>
                <td style={{ fontWeight: 600 }}>{region.name}</td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{region.latitude.toFixed(2)}, {region.longitude.toFixed(2)}</td>
                <td>{region.rainfall_mm} mm</td>
                <td>{region.soil_saturation}%</td>
                <td>{region.slope_angle}°</td>
                <td><span className={`vibration-status ${region.vibration ? 'vibration-status--detected' : 'vibration-status--stable'}`}><span className="vibration-wave">〰</span>{region.vibration ? 'Detected' : 'Stable'}</span></td>
                <td>
                  <select value={region.risk_level} onChange={e => updateRiskLevel(region, e.target.value)} style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.8rem', cursor: 'pointer', background: RISK_BG[region.risk_level], color: RISK_TEXT[region.risk_level], fontWeight: 600, border: `1.5px solid ${RISK_COLORS[region.risk_level]}` }}>
                    {RISK_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button className="btn btn-sm btn-primary" onClick={() => openEdit(region)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(region.region_id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Edit Region' : 'Add Region'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Latitude *</label><input className="form-input" type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Longitude *</label><input className="form-input" type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} required /></div>
              </div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Rainfall (mm) *</label><input className="form-input" type="number" step="any" value={form.rainfall_mm} onChange={e => setForm({ ...form, rainfall_mm: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Soil Saturation (%) *</label><input className="form-input" type="number" step="any" value={form.soil_saturation} onChange={e => setForm({ ...form, soil_saturation: e.target.value })} required /></div>
              </div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Slope Angle (°) *</label><input className="form-input" type="number" step="any" value={form.slope_angle} onChange={e => setForm({ ...form, slope_angle: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Earthquake vibration detected</label><input className="form-input" type="checkbox" checked={form.vibration} onChange={e => setForm({ ...form, vibration: e.target.checked })} style={{ width: 'auto', marginTop: '0.5rem' }} /></div>
              </div>
              <div className="form-group"><label className="form-label">Alert Message</label><input className="form-input" value={form.alert_message} onChange={e => setForm({ ...form, alert_message: e.target.value })} /></div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} disabled={saving}>
                {saving ? 'Saving...' : (editing ? 'Update Region' : 'Create Region')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
