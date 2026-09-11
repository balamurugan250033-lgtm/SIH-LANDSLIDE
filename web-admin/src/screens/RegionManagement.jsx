import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CloudRain, LocateFixed, MapPin, Mountain, Pencil, Plus, ShieldAlert, Waves } from 'lucide-react';
import { saveRegion, deleteRegion, ingestLiveTelemetry, fetchRiskTrend } from '../api';

const RISK_LEVELS = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'SEVERE'];
const RISK_COLORS = { LOW: '#16A34A', MODERATE: '#D97706', HIGH: '#EA580C', CRITICAL: '#DC2626', SEVERE: '#7C2D12' };
const RISK_BG = { LOW: '#DCFCE7', MODERATE: '#FEF3C7', HIGH: '#FFEDD5', CRITICAL: '#FEE2E2', SEVERE: '#FECACA' };
const RISK_TEXT = { LOW: '#166534', MODERATE: '#92400E', HIGH: '#9A3412', CRITICAL: '#991B1B', SEVERE: '#7C2D12' };

export default function RegionManagement({ regions: initialRegions, onRefresh, token }) {
  const [regions, setRegions] = useState(initialRegions || []);
  const [selectedRegionId, setSelectedRegionId] = useState(null);
  const [riskTrend, setRiskTrend] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
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
    setSelectedRegionId(current => (initialRegions || []).some(region => region.region_id === current) ? current : (initialRegions || [])[0]?.region_id ?? null);
    setLastUpdated(new Date());
  }, [initialRegions]);

  const selectedRegion = regions.find(region => region.region_id === selectedRegionId) || null;
  const criticalCount = regions.filter(region => ['CRITICAL', 'SEVERE'].includes(region.risk_level)).length;
  const highRiskCount = regions.filter(region => ['HIGH', 'CRITICAL', 'SEVERE'].includes(region.risk_level)).length;

  function getFormulaScore(region) {
    const rainfall = Math.min(Number(region.rainfall_mm || 0) / 150, 1);
    const moisture = Math.min(Math.max(Number(region.soil_saturation || 0) / 100, 0), 1);
    const slope = Math.min(Number(region.slope_angle || 0) / 35, 1);
    return Math.min((0.4 * rainfall + 0.35 * moisture + 0.25 * slope) * (rainfall > 0.7 && moisture > 0.7 ? 1.3 : 1), 1);
  }

  useEffect(() => {
    if (!selectedRegionId) { setRiskTrend(null); return; }
    let cancelled = false;
    setTrendLoading(true);
    fetchRiskTrend(selectedRegionId, token)
      .then(data => { if (!cancelled) setRiskTrend(data); })
      .catch(() => { if (!cancelled) setRiskTrend(null); })
      .finally(() => { if (!cancelled) setTrendLoading(false); });
    return () => { cancelled = true; };
  }, [selectedRegionId, token]);

  function trendPolyline(points) {
    if (!points?.length) return '';
    const denominator = Math.max(points.length - 1, 1);
    return points.map((point, index) => `${(index / denominator) * 100},${96 - Number(point.risk_score || 0) * 92}`).join(' ');
  }

  const dayComparison = useMemo(() => {
    const points = riskTrend?.points || [];
    if (!points.length) return null;
    const todayKey = new Date().toLocaleDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toLocaleDateString();
    const latestForDay = (key) => points.filter(point => new Date(point.timestamp).toLocaleDateString() === key).at(-1);
    const todayPoint = latestForDay(todayKey);
    const yesterdayPoint = latestForDay(yesterdayKey);
    const value = (point) => Number.isFinite(Number(point?.soil_saturation)) ? Number(point.soil_saturation) : null;
    const today = value(todayPoint);
    const yesterdayValue = value(yesterdayPoint);
    return {
      today,
      yesterday: yesterdayValue,
      change: today != null && yesterdayValue != null ? Number((today - yesterdayValue).toFixed(2)) : null,
    };
  }, [riskTrend]);

  async function refreshLiveData() {
    setRefreshing(true);
    try {
      await ingestLiveTelemetry(token);
      if (onRefresh) await onRefresh();
      setLastUpdated(new Date());
    } catch (error) {
      alert(error.message);
    } finally {
      setRefreshing(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', latitude: '25.500', longitude: '92.000', rainfall_mm: '75', soil_saturation: '65', slope_angle: '30', vibration: false, alert_message: '' });
    setShowModal(true);
  }

  function openEdit(region) {
    setEditing(region);
    setForm({
      name: region.name,
      latitude: region.latitude,
      longitude: region.longitude,
      rainfall_mm: region.rainfall_mm,
      soil_saturation: region.soil_saturation,
      slope_angle: region.slope_angle,
      vibration: region.vibration,
      alert_message: region.alert_message || '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        latitude: parseFloat(form.latitude) || 0,
        longitude: parseFloat(form.longitude) || 0,
        rainfall_mm: parseFloat(form.rainfall_mm) || 0,
        soil_saturation: parseFloat(form.soil_saturation) || 0,
        slope_angle: parseFloat(form.slope_angle) || 0,
        vibration: Boolean(form.vibration),
        alert_message: form.alert_message || null,
        risk_level: editing ? editing.risk_level : (parseFloat(form.soil_saturation) > 85 ? 'CRITICAL' : 'MODERATE'),
      };

      await saveRegion(payload, editing ? editing.region_id : null, token);
      setShowModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(regionId) {
    if (!confirm('Are you sure you want to remove this monitored region?')) return;
    try {
      await deleteRegion(regionId, token);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Failed to delete region');
    }
  }

  async function updateRiskLevel(region, level) {
    try {
      await saveRegion({ ...region, risk_level: level }, region.region_id, token);
      setRegions(prev => prev.map(r => r.region_id === region.region_id ? { ...r, risk_level: level } : r));
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to update risk level:', err);
    }
  }

  return (
    <div>
      <div className="live-monitor-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem', background: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        <div className="live-monitor-status" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 600 }}>
          <span className="live-dot" style={{ width: 10, height: 10, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
          Live NER Sensor Monitoring Grid
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="live-monitor-time" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Telemetry synced: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button className="btn btn-sm btn-secondary" onClick={refreshLiveData} disabled={refreshing} style={{ padding: '0.4rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border)', background: '#F8FAFC', cursor: 'pointer', fontWeight: 500 }}>
            {refreshing ? 'Getting live weather...' : 'Update live data'}
          </button>
        </div>
      </div>

      <section className="ner-summary-grid" aria-label="NER monitoring summary">
        <div className="ner-summary-card"><div className="ner-summary-icon ner-summary-icon--blue"><MapPin size={20} /></div><div><strong>{regions.length}</strong><span>Monitored NER regions</span></div></div>
        <div className="ner-summary-card"><div className="ner-summary-icon ner-summary-icon--red"><ShieldAlert size={20} /></div><div><strong>{criticalCount}</strong><span>Critical alerts</span></div></div>
        <div className="ner-summary-card"><div className="ner-summary-icon ner-summary-icon--amber"><Activity size={20} /></div><div><strong>{highRiskCount}</strong><span>High-risk regions</span></div></div>
        <div className="ner-summary-card"><div className="ner-summary-icon ner-summary-icon--green"><Waves size={20} /></div><div><strong>{regions.filter(region => !region.vibration).length}/{regions.length}</strong><span>Stations stable</span></div></div>
      </section>

      {selectedRegion && <section className="ner-selected-detail">
        <div className="ner-detail-heading"><div><span>SELECTED NER STATION</span><h3>{selectedRegion.name}</h3><p><LocateFixed size={15} /> {Number(selectedRegion.latitude).toFixed(4)}, {Number(selectedRegion.longitude).toFixed(4)}</p></div><button className="ner-icon-button" onClick={() => openEdit(selectedRegion)} aria-label="Edit selected region"><Pencil size={17} /></button></div>
        <div className="ner-risk-score"><span>Formula ML risk score</span><strong>{Math.round(getFormulaScore(selectedRegion) * 100)}%</strong><div><i style={{ width: `${getFormulaScore(selectedRegion) * 100}%`, background: RISK_COLORS[selectedRegion.risk_level] || RISK_COLORS.LOW }} /></div><small>40% rain + 35% soil moisture + 25% slope</small></div>
        <div className="ner-detail-metrics"><span><CloudRain size={18} /><b>{selectedRegion.rainfall_mm ?? 0} mm</b><small>Rainfall / 24 h</small></span><span><Waves size={18} /><b>{selectedRegion.soil_saturation ?? 0}%</b><small>Soil saturation</small></span><span><Mountain size={18} /><b>{selectedRegion.slope_angle ?? 0}°</b><small>Slope angle</small></span><span><Activity size={18} /><b>{selectedRegion.vibration ? 'Detected' : 'Stable'}</b><small>Vibration</small></span></div>
        {selectedRegion.alert_message && <p className="ner-detail-warning"><AlertTriangle size={17} /> {selectedRegion.alert_message}</p>}
      </section>}

      <section className="ner-trend-panel">
        <div className="ner-trend-header"><div><span>AI TREND ANALYSIS</span><h3>Soil saturation — today vs yesterday</h3></div><b className={`ner-trend-direction ner-trend-direction--${riskTrend?.direction?.toLowerCase() || 'unknown'}`}>{trendLoading ? 'LOADING' : riskTrend?.direction?.replace('_', ' ') || 'NO DATA'}</b></div>
        {riskTrend?.points?.length ? <><div className="ner-day-comparison"><span><small>Yesterday</small><strong>{dayComparison?.yesterday == null ? '--' : `${dayComparison.yesterday.toFixed(2)}%`}</strong></span><span><small>Today</small><strong>{dayComparison?.today == null ? '--' : `${dayComparison.today.toFixed(2)}%`}</strong></span><span><small>Change</small><strong className={dayComparison?.change > 0 ? 'is-up' : dayComparison?.change < 0 ? 'is-down' : ''}>{dayComparison?.change == null ? 'Not comparable' : `${dayComparison.change > 0 ? '+' : ''}${dayComparison.change.toFixed(2)} pts`}</strong></span></div><svg className="ner-trend-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Observed soil saturation over the last 48 hours"><line x1="0" y1="20" x2="100" y2="20"/><line x1="0" y1="50" x2="100" y2="50"/><line x1="0" y1="80" x2="100" y2="80"/><polyline points={riskTrend.points.map((point, index) => `${(index / Math.max(riskTrend.points.length - 1, 1)) * 100},${96 - Number(point.soil_saturation || 0) * .92}`).join(' ')} /></svg><div className="ner-trend-labels"><span>{new Date(riskTrend.points[0].timestamp).toLocaleDateString()}</span><span>{riskTrend.points.length} actual readings · last 48 hours</span><span>{new Date(riskTrend.points.at(-1).timestamp).toLocaleDateString()}</span></div></> : <p className="ner-trend-empty">{trendLoading ? 'Loading observed readings…' : 'No observation history yet. Use “Update live data” to collect the first real reading.'}</p>}
      </section>

      <div className="table-panel">
        <div className="table-header">
          <h3 className="table-title">Configured Regional Zones</h3>
          <div className="table-actions">
            <button className="btn btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Monitoring Station
            </button>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Zone Name</th>
              <th>Coordinates</th>
              <th>Rainfall</th>
              <th>Soil Sat.</th>
              <th>Slope</th>
              <th>Seismic Shift</th>
              <th>Model Risk</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {regions.map(region => (
              <tr key={region.region_id} onClick={() => setSelectedRegionId(region.region_id)} className={region.region_id === selectedRegionId ? 'ner-table-row--selected' : ''}>
                <td style={{ fontWeight: 600 }}>{region.name}</td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {Number(region.latitude).toFixed(2)}, {Number(region.longitude).toFixed(2)}
                </td>
                <td>{region.rainfall_mm} mm</td>
                <td>{region.soil_saturation}%</td>
                <td>{region.slope_angle}°</td>
                <td>
                  <span className={`vibration-status ${region.vibration ? 'vibration-status--detected' : 'vibration-status--stable'}`} style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: region.vibration ? '#FEE2E2' : '#DCFCE7', color: region.vibration ? '#DC2626' : '#166534' }}>
                    {region.vibration ? '⚡ Detected' : '✔ Normal'}
                  </span>
                </td>
                <td>
                  <select
                    value={region.risk_level}
                    onChange={e => updateRiskLevel(region, e.target.value)}
                    style={{
                      padding: '0.3rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      background: RISK_BG[region.risk_level],
                      color: RISK_TEXT[region.risk_level],
                      fontWeight: 700,
                      border: `1.5px solid ${RISK_COLORS[region.risk_level]}`,
                    }}
                  >
                    {RISK_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn btn-sm btn-primary" onClick={() => openEdit(region)} style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border)', background: '#EFF6FF', color: '#2563EB', fontWeight: 600, cursor: 'pointer' }}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(region.region_id)} style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontWeight: 600, cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '540px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 className="modal-title" style={{ fontSize: '1.2rem', fontWeight: 700 }}>{editing ? 'Edit Region Telemetry' : 'Add Monitored Region'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Region Station Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kohima - Mount Japfu" style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }} required />
              </div>
              <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Latitude *</label>
                  <input className="form-input" type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }} required />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Longitude *</label>
                  <input className="form-input" type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }} required />
                </div>
              </div>
              <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Rainfall (mm) *</label>
                  <input className="form-input" type="number" step="any" value={form.rainfall_mm} onChange={e => setForm({ ...form, rainfall_mm: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }} required />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Soil Saturation (%) *</label>
                  <input className="form-input" type="number" step="any" value={form.soil_saturation} onChange={e => setForm({ ...form, soil_saturation: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }} required />
                </div>
              </div>
              <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Slope Angle (°) *</label>
                  <input className="form-input" type="number" step="any" value={form.slope_angle} onChange={e => setForm({ ...form, slope_angle: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }} required />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                  <input type="checkbox" id="vibeCheck" checked={form.vibration} onChange={e => setForm({ ...form, vibration: e.target.checked })} style={{ width: 18, height: 18 }} />
                  <label htmlFor="vibeCheck" className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Vibration Shift Detected</label>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Custom Warning Advisory</label>
                <input className="form-input" value={form.alert_message} onChange={e => setForm({ ...form, alert_message: e.target.value })} placeholder="e.g. Caution: Active slope instability" style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }} disabled={saving}>
                {saving ? 'Saving...' : (editing ? 'Save Changes' : 'Create Region')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
