import { useState, useEffect } from 'react';
import { sendNotification } from '../api';

const CHANNELS = ['SMS', 'EMAIL', 'PUSH', 'VOICE', 'SIREN', 'MESH'];

const CHANNEL_ICONS = {
  SMS: '📱',
  EMAIL: '📧',
  PUSH: '🔔',
  VOICE: '📞',
  SIREN: '📢',
  MESH: '📡',
};

function formatNotificationTime(notification) {
  const value = notification.created_at || notification.sent_at || notification.timestamp;
  if (!value || Number.isNaN(Date.parse(value))) return 'Just now';
  return new Date(value).toLocaleString();
}

export default function NotificationManagement({ notifications: initialNotifications, regions = [], onRefresh, token }) {
  const [notifications, setNotifications] = useState(initialNotifications || []);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    region_id: '',
    channel: 'SMS',
    message: '',
    recipients: '',
    language: 'en',
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setNotifications(initialNotifications || []);
  }, [initialNotifications]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    try {
      await sendNotification({
        ...form,
        recipients: form.recipients.split(',').map(r => r.trim()).filter(Boolean),
      }, token);
      setShowModal(false);
      setForm({ region_id: '', channel: 'SMS', message: '', recipients: '', language: 'en' });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="table-panel">
        <div className="table-header">
          <h3 className="table-title">Dispatched Multi-Channel Advisories</h3>
          <div className="table-actions">
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              Broadcast Advisory Bulletin
            </button>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Channel</th>
              <th>Advisory Content</th>
              <th>Target Region</th>
              <th>Transmission Status</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((notif, i) => {
              const reg = regions.find(r => r.region_id === notif.region_id || r.id === notif.region_id);
              return (
                <tr key={notif.id || i}>
                  <td>
                    <span className="badge" style={{ background: '#EFF6FF', color: '#2563EB', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {CHANNEL_ICONS[(notif.channel || '').toUpperCase()] || '📨'} {(notif.channel || 'OFFICIAL').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {notif.message}
                  </td>
                  <td>{reg ? reg.name : `Region #${notif.region_id}`}</td>
                  <td>
                    <span className="badge" style={{ background: '#DCFCE7', color: '#166534', fontWeight: 700 }}>
                      {notif.status || 'SENT'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatNotificationTime(notif)}</td>
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
              <h3 className="modal-title" style={{ fontSize: '1.2rem', fontWeight: 700 }}>Broadcast Multi-Channel Advisory</h3>
              <button className="modal-close" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Target Region *</label>
                <select className="form-input" value={form.region_id} onChange={e => setForm({ ...form, region_id: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }} required>
                  <option value="">Select target region...</option>
                  {regions.map(r => <option key={r.region_id} value={r.region_id}>{r.name}</option>)}
                </select>
              </div>
              <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Broadcast Channel *</label>
                  <select className="form-input" value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    {CHANNELS.map(c => <option key={c} value={c}>{CHANNEL_ICONS[c]} {c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Language</label>
                  <select className="form-input" value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="as">Assamese</option>
                    <option value="bn">Bengali</option>
                    <option value="kha">Khasi</option>
                    <option value="mzo">Mizo</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Recipient Group / Number Filter</label>
                <input className="form-input" value={form.recipients} onChange={e => setForm({ ...form, recipients: e.target.value })} placeholder="All registered citizens in zone, or specific phone numbers" style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }} />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Advisory Message Content *</label>
                <textarea className="form-textarea" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="e.g. Flash Flood & Landslide Warning: Avoid river valleys and hill cut roads." style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', minHeight: 75 }} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }} disabled={sending}>
                {sending ? 'Broadcasting...' : 'Broadcast to All Network Channels'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
