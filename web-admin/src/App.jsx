import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './screens/Dashboard';
import RegionManagement from './screens/RegionManagement';
import AlertManagement from './screens/AlertManagement';
import NotificationManagement from './screens/NotificationManagement';
import ReportManagement from './screens/ReportManagement';
import { fetchStats, fetchRegions, fetchAlerts, fetchNotifications, fetchReports } from './api';

export default function App({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [regions, setRegions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);

    let ws = null;
    try {
      if (typeof window !== 'undefined' && window.WebSocket) {
        const isSecure = window.location.protocol === 'https:';
        const wsProtocol = isSecure ? 'wss:' : 'ws:';
        const wsUrl = import.meta.env.VITE_WS_URL || `${wsProtocol}//${window.location.host}/ws`;
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'new_alert' || msg.type === 'new_notification' || msg.type === 'new_report') {
              loadData();
            }
          } catch {}
        };
        ws.onerror = () => {};
      }
    } catch {}

    return () => {
      clearInterval(interval);
      if (ws && ws.readyState === WebSocket.OPEN) {
        try { ws.close(); } catch {}
      }
    };
  }, [token]);

  async function loadData() {
    try {
      const [s, r, a, n, rep] = await Promise.all([
        fetchStats(token),
        fetchRegions(token),
        fetchAlerts(token),
        fetchNotifications(token),
        fetchReports(token),
      ]);
      setStats(s);
      setRegions(r);
      setAlerts(a);
      setNotifications(n);
      setReports(rep);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-app">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        reportCount={reports.length}
      />
      <div className="main-area">
        <TopBar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />
        <div className="content">
          {loading && !stats && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Connecting to admin telemetry grid...
            </div>
          )}
          {activeTab === 'dashboard' && (
            <Dashboard
              stats={stats}
              regions={regions}
              alerts={alerts}
              notifications={notifications}
              reports={reports}
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === 'regions' && (
            <RegionManagement
              regions={regions}
              onRefresh={loadData}
              token={token}
            />
          )}
          {activeTab === 'alerts' && (
            <AlertManagement
              alerts={alerts}
              regions={regions}
              onRefresh={loadData}
              token={token}
            />
          )}
          {activeTab === 'reports' && (
            <ReportManagement
              reports={reports}
              regions={regions}
              onRefresh={loadData}
              token={token}
            />
          )}
          {activeTab === 'notifications' && (
            <NotificationManagement
              notifications={notifications}
              regions={regions}
              onRefresh={loadData}
              token={token}
            />
          )}
        </div>
      </div>
    </div>
  );
}
