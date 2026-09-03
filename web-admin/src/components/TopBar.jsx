import { useState } from 'react';

export default function TopBar({ activeTab, setActiveTab, onLogout }) {
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useState(() => {
    const interval = setInterval(() => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })), 30000);
    return () => clearInterval(interval);
  });

  const titles = { dashboard: 'Dashboard', regions: 'Region Management', alerts: 'Alert Management', notifications: 'Notification Center' };

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{titles[activeTab] || 'Admin'}</div>
      </div>
      <div className="topbar-actions">
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{time}</span>
        <button className="topbar-btn topbar-btn--danger" onClick={onLogout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Logout
        </button>
      </div>
    </header>
  );
}
