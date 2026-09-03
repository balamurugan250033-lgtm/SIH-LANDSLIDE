import { useState } from 'react';
import { BarChart3, Map, TriangleAlert, Megaphone, LogOut } from 'lucide-react';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'regions', label: 'Regions', icon: Map },
  { id: 'alerts', label: 'Alerts', icon: TriangleAlert },
  { id: 'notifications', label: 'Notifications', icon: Megaphone },
];

export default function Sidebar({ activeTab, setActiveTab, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
        <div>
          <div className="sidebar-title">Landslide Sentinel</div>
          <div className="sidebar-subtitle">Admin Console</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {NAV.map(item => (
          <button key={item.id} className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
            <item.icon size={18} strokeWidth={2} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="admin-badge">
          <div className="admin-avatar">A</div>
          <div className="admin-info">
            <div className="admin-name">Administrator</div>
            <div className="admin-role">Super Admin</div>
          </div>
          <button onClick={onLogout} title="Sign out" className="sidebar-signout">
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}
