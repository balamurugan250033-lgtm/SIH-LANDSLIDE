import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './screens/Dashboard';
import RegionManagement from './screens/RegionManagement';
import AlertManagement from './screens/AlertManagement';
import NotificationManagement from './screens/NotificationManagement';
import { fetchStats, fetchRegions, fetchAlerts, fetchNotifications } from './api';

export default function App({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [regions, setRegions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); const interval = setInterval(loadData, 30000); return () => clearInterval(interval); }, []);

  async function loadData() {
    try {
      const [s, r, a, n] = await Promise.all([fetchStats(token), fetchRegions(token), fetchAlerts(token), fetchNotifications(token)]);
      setStats(s); setRegions(r); setAlerts(a); setNotifications(n);
    } catch (err) { console.error('Failed to load admin data:', err); }
    finally { setLoading(false); }
  }

  return (
    <div className="admin-app">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />
      <div className="main-area">
        <TopBar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />
        <div className="content">
          {loading && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading dashboard...</div>}
          {!loading && activeTab === 'dashboard' && <Dashboard stats={stats} regions={regions} alerts={alerts} notifications={notifications} />}
          {!loading && activeTab === 'regions' && <RegionManagement regions={regions} onRefresh={loadData} token={token} />}
          {!loading && activeTab === 'alerts' && <AlertManagement alerts={alerts} regions={regions} onRefresh={loadData} token={token} />}
          {!loading && activeTab === 'notifications' && <NotificationManagement notifications={notifications} regions={regions} onRefresh={loadData} token={token} />}
        </div>
      </div>
    </div>
  );
}
