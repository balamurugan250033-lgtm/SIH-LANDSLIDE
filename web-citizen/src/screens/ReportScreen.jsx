import { useState, useEffect, useRef } from 'react';
import { fetchCitizenReports } from '../api';

const HAZARDS = [
  { id: 'Cracks in Ground', label: 'Cracks in Ground', icon: '⬡' },
  { id: 'Water Seepage', label: 'Water Seepage', icon: '💧' },
  { id: 'Tilted Trees/Poles', label: 'Tilted Trees/Poles', icon: '🌲' },
  { id: 'Rockfall', label: 'Rockfall', icon: '🪨' },
  { id: 'Road Damage', label: 'Road Damage', icon: '🚧' },
  { id: 'Flooding', label: 'Flooding', icon: '🌊' },
];

export default function ReportScreen({ onSubmit, regions = [], selectedRegion, onSelectRegion }) {
  const [form, setForm] = useState({
    region_id: selectedRegion || (regions[0]?.region_id || regions[0]?.id || ''),
    description: '',
    hazard_types: ['Cracks in Ground'],
    photo_data: '',
    photo_name: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [recentReports, setRecentReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (selectedRegion) {
      setForm(f => ({ ...f, region_id: selectedRegion }));
    } else if (regions.length > 0 && !form.region_id) {
      setForm(f => ({ ...f, region_id: regions[0].region_id || regions[0].id }));
    }
  }, [selectedRegion, regions]);

  useEffect(() => {
    loadRecentReports();
  }, [form.region_id]);

  async function loadRecentReports() {
    setLoadingReports(true);
    try {
      const data = await fetchCitizenReports(form.region_id || null);
      setRecentReports(data);
    } catch {
      setRecentReports([]);
    } finally {
      setLoadingReports(false);
    }
  }

  const toggleHazard = (id) => {
    setForm(f => {
      const exists = f.hazard_types.includes(id);
      const updated = exists ? f.hazard_types.filter(h => h !== id) : [...f.hazard_types, id];
      return {
        ...f,
        hazard_types: updated.length > 0 ? updated : [id],
      };
    });
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target.result;
      // Compress and resize image using canvas to ensure fast transfer
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1200;
        const maxHeight = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);

        setForm(f => ({
          ...f,
          photo_data: compressedDataUrl,
          photo_name: file.name,
        }));
        setError('');
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setForm(f => ({ ...f, photo_data: '', photo_name: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const effectiveRegionId = form.region_id || regions[0]?.region_id || regions[0]?.id;
    if (!effectiveRegionId) {
      setError('Please select a monitored region.');
      return;
    }
    if (!form.description || form.description.trim().length < 3) {
      setError('Please enter a description of at least 3 characters.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await onSubmit({
        region_id: effectiveRegionId,
        description: form.description.trim(),
        hazard_types: form.hazard_types.length > 0 ? form.hazard_types : ['General Hazard'],
        photo_url: form.photo_data || null,
        media_path: form.photo_data || null,
        media_content_type: form.photo_data ? 'image/jpeg' : null,
      });
      setSuccessMsg(res?.message || 'Incident report submitted successfully!');
      setForm(f => ({ ...f, description: '', photo_data: '', photo_name: '' }));
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadRecentReports();
      setTimeout(() => setSuccessMsg(''), 8000);
    } catch (err) {
      setError(err.message || 'Failed to submit report. Please check connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="panel">
        <div className="panel-header">
          <h2>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            Submit Citizen Hazard Report
          </h2>
          <span className="panel-badge">On-Ground Intelligence</span>
        </div>
        <form className="report-form" onSubmit={handleSubmit}>
          {error && (
            <div className="message message--error" style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              {error}
            </div>
          )}
          {successMsg && (
            <div className="message message--success" style={{ background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <strong>{successMsg}</strong>
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
                {regions.map(r => {
                  const idVal = r.region_id || r.id;
                  return (
                    <option key={idVal} value={idVal}>
                      {r.name}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Hazard Category (click to toggle) *</label>
            <div className="hazard-grid">
              {HAZARDS.map(h => {
                const active = form.hazard_types.includes(h.id);
                return (
                  <button
                    key={h.id}
                    type="button"
                    className={`hazard-chip ${active ? 'hazard-chip--active' : ''}`}
                    onClick={() => toggleHazard(h.id)}
                    style={active ? { background: '#EFF6FF', borderColor: '#3B82F6', color: '#1D4ED8', fontWeight: 700 } : {}}
                  >
                    <div className="hazard-chip-icon">{h.icon}</div>
                    <div className="hazard-chip-content">
                      <div className="hazard-chip-title">{h.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Incident Description *</label>
            <textarea
              className="form-textarea"
              placeholder="Describe what you observe: ground crack width, active mud runoff, slope sliding, blocked routes..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              maxLength={500}
              required
            />
            <div className="char-count">{form.description.length}/500</div>
          </div>

          <div className="form-group">
            <label className="form-label">Upload Photo Evidence (From Camera or Gallery)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
              id="citizen-photo-upload"
            />

            {!form.photo_data ? (
              <label
                htmlFor="citizen-photo-upload"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1.75rem',
                  border: '2px dashed #CBD5E1',
                  borderRadius: '10px',
                  background: '#F8FAFC',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                }}
              >
                <div style={{ background: '#EFF6FF', color: '#2563EB', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
                <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '0.92rem' }}>
                  Click to Take Photo or Browse Files
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
                  Supports PNG, JPG, JPEG, WEBP (Camera capture supported on phones)
                </div>
              </label>
            ) : (
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <img
                    src={form.photo_data}
                    alt="Preview"
                    style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1E293B' }}>{form.photo_name || 'Ground evidence photo'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#16A34A', marginTop: '2px', fontWeight: 600 }}>✓ Ready for submission</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removePhoto}
                  style={{
                    background: '#FEE2E2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Remove Photo
                </button>
              </div>
            )}
          </div>

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? (<><div className="spinner"></div> Submitting Report to Supabase...</>) : 'Submit Verified Report'}
          </button>
        </form>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
            Community Ground Reports Feed
          </h2>
          <span className="panel-badge">{recentReports.length} recorded</span>
        </div>

        {loadingReports ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading live community reports...</div>
        ) : recentReports.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No citizen reports submitted for this region yet. Submit the first report above!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0' }}>
            {recentReports.map(rep => {
              const reg = regions.find(r => (r.region_id === rep.region_id || r.id === rep.region_id));
              const hazards = rep.hazard_types?.length ? rep.hazard_types.join(', ') : (rep.hazard_type || 'Hazard Report');
              const photo = rep.photo_url || rep.media_path;
              return (
                <div key={rep.id} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1E293B' }}>
                        {reg ? reg.name : `Region #${rep.region_id}`} — <span style={{ color: '#2563EB' }}>{hazards}</span>
                      </span>
                      <span
                        className="badge"
                        style={{
                          background: rep.status === 'Validated' ? '#DCFCE7' : rep.status === 'Under Review' ? '#FEF3C7' : '#EFF6FF',
                          color: rep.status === 'Validated' ? '#166534' : rep.status === 'Under Review' ? '#92400E' : '#1E40AF',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        {rep.status || 'Submitted'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>{rep.description}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{new Date(rep.timestamp).toLocaleString()}</div>
                  </div>

                  {photo && (
                    <img
                      src={photo}
                      alt="Ground evidence"
                      style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: '6px', border: '1px solid #CBD5E1', flexShrink: 0 }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
