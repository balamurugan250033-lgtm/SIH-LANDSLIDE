import { useState, useEffect } from 'react';

const CHANNEL_ICONS = {
  SMS: '📱',
  EMAIL: '📧',
  PUSH: '🔔',
  VOICE: '📞',
  SIREN: '📢',
  MESH: '📡',
};

export default function NotificationsScreen({ notifications: initialNotifications }) {
  const [notifications, setNotifications] = useState(initialNotifications || []);
  const [filter, setFilter] = useState('all');

  useEffect(() => { setNotifications(initialNotifications || []); }, [initialNotifications]);

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.channel === filter);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          Notifications
        </h2>
        <span className="panel-badge">{filtered.length} messages</span>
      </div>
      <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['all', 'SMS', 'EMAIL', 'PUSH', 'VOICE', 'SIREN', 'MESH'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`nav-link ${filter === f ? 'active' : ''}`} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
            {f === 'all' ? 'All' : `${CHANNEL_ICONS[f] || ''} ${f}`}
          </button>
        ))}
      </div>
      <div className="notifications-list">
        {filtered.length === 0 && (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <p>No notifications to display.</p>
          </div>
        )}
        {filtered.map((notif, i) => (
          <div key={i} className="notification-card">
            <div className="notification-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                <span>{CHANNEL_ICONS[notif.channel] || '📨'}</span>
                {notif.channel} Alert
              </div>
              <div className="notification-time">{new Date(notif.created_at).toLocaleString()}</div>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: '0.35rem' }}>
              {notif.message}
            </div>
            <div className="notification-meta">
              <span className="region-risk-badge" style={{ background: '#F1F5F9', color: '#475569', fontSize: '0.7rem' }}>
                {notif.region_id}
              </span>
              <span className="notification-channel">Status: {notif.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
