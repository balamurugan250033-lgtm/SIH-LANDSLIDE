import { useState, useEffect } from 'react';
import { sendNotification, fetchNotifications } from '../api';

const CHANNELS = ['SMS', 'EMAIL', 'PUSH', 'VOICE', 'SIREN', 'MESH'];

function formatNotificationTime(notification) {
  const value = notification.created_at || notification.sent_at;
  if (!value || Number.isNaN(Date.parse(value))) return '--';
  return new Date(value).toLocaleString();
}

export default function NotificationManagement({ notifications: initialNotifications, regions, onRefresh, token }) {
  const [notifications, setNotifications] = useState(initialNotifications || []);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ region_id: '', channel: 'SMS', message: '', recipients: '', language: 'en' });
  const [sending, setSending] = useState(false);

  useEffect(() => { setNotifications(initialNotifications || []); }, [initialNotifications]);

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
      onRefresh();
    } catch (err) { alert(err.message); }
    finally { setSending(false); }
  }

  return (
    <div>
      <div className="table-panel">
        <div className="table-header">
          <h3 className="table-title">Notification History</h3>
          <div className="table-actions">
            <button className="btn btn-primary" onClick={() => setShowModal(true)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg> Send Notification</button>
          </div>
        </div>
        <table className="data-table">
          <thead><tr><th>Channel</th><th>Message</th><th>Region</th><th>Status</th><th>Time</th></tr></thead>
          <tbody>
            {notifications.map((notif, i) => (
              <tr key={i}>
                <td><span className="badge badge--info">{notif.channel}</span></td>
                <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notif.message}</td>
                <td>{notif.region_id}</td>
                <td><span className="badge badge--success">{notif.status}</span></td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatNotificationTime(notif)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Send Notification</h3>
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
                  <label className="form-label">Channel *</label>
                  <select className="form-input" value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}>
                    {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Language</label>
                  <select className="form-input" value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="kn">Kannada</option>
                    <option value="ta">Tamil</option>
                    <option value="te">Telugu</option>
                  </select>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Recipients (comma-separated)</label><input className="form-input" value={form.recipients} onChange={e => setForm({ ...form, recipients: e.target.value })} placeholder="user1@example.com, +919876543210" /></div>
              <div className="form-group"><label className="form-label">Message *</label><textarea className="form-textarea" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required /></div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} disabled={sending}>
                {sending ? 'Sending...' : 'Send Notification'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
