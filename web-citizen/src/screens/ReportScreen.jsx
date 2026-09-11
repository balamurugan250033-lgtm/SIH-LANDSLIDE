import { useState, useEffect } from 'react';

const HAZARDS = [
  { id: 'cracks', label: 'Cracks in Ground', icon: '⬡' },
  { id: 'water', label: 'Water Seepage', icon: '💧' },
  { id: 'tilt', label: 'Tilted Trees/Poles', icon: '🌲' },
  { id: 'rockfall', label: 'Rockfall', icon: '🪨' },
  { id: 'road', label: 'Road Damage', icon: '🚧' },
  { id: 'flooding', label: 'Flooding', icon: '🌊' },
];

export default function ReportScreen({ onSubmit, regions, selectedRegion, onSelectRegion }) {
  const [form, setForm] = useState({
    region_id: selectedRegion || '',
    description: '',
    hazard_types: [],
    photo_url: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (selectedRegion) {
      setForm(f => ({ ...f, region_id: selectedRegion }));
    }
  }, [selectedRegion]);

  const toggleHazard = (id) => {
    setForm(f => ({
      ...f,
      hazard_types: f.hazard_types.includes(id)
        ? f.hazard_types.filter(h => h !== id)
        : [...f.hazard_types, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.region_id || !form.description || form.hazard_types.length === 0) {
      setError('Please select a region, hazard category, and add a brief description.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await onSubmit({
        region_id: form.region_id,
        description: form.description,
        hazard_types: form.hazard_types,
        photo_url: form.photo_url || null,
      });
      setSuccessMsg(res?.message || 'Incident report recorded successfully!');
      setForm({ region_id: form.region_id, description: '', hazard_types: [], photo_url: '' });
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          Submit Citizen Hazard Report
        </h2>
        <span className="panel-badge">On-Ground Intelligence</span>
      </div>
      <form className="report-form" onSubmit={handleSubmit}>
        {error && <div className="message message--error">{error}</div>}
        {successMsg && (
          <div className="message message--success" style={{ background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            {successMsg}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Region Location *</label>
          <div className="region-select">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <select
              value={form.region_id}
              onChange={e => {
                setForm({ ...form, region_id: e.target.value });
                if (onSelectRegion) onSelectRegion(e.target.value);
              }}
              required
            >
              <option value="">Select monitored region...</option>
              {regions.map(r => (
                <option key={r.region_id} value={r.region_id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Hazard Category *</label>
          <div className="hazard-grid">
            {HAZARDS.map(h => (
              <button
                key={h.id}
                type="button"
                className={`hazard-chip ${form.hazard_types.includes(h.id) ? 'hazard-chip--active' : ''}`}
                onClick={() => toggleHazard(h.id)}
              >
                <div className="hazard-chip-icon">{h.icon}</div>
                <div className="hazard-chip-content">
                  <div className="hazard-chip-title">{h.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Incident Description *</label>
          <textarea
            className="form-textarea"
            placeholder="Describe what you see: crack width, slope movement, water runoff, damaged infrastructure..."
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            maxLength={500}
            required
          />
          <div className="char-count">{form.description.length}/500</div>
        </div>

        <div className="form-group">
          <label className="form-label">Photo Evidence URL (optional)</label>
          <input
            className="form-input"
            type="url"
            placeholder="https://example.com/ground-photo.jpg"
            value={form.photo_url}
            onChange={e => setForm({ ...form, photo_url: e.target.value })}
          />
        </div>

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? (<><div className="spinner"></div> Submitting Report...</>) : 'Submit Verified Report'}
        </button>
      </form>
    </div>
  );
}
