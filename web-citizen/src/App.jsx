import { useState, useEffect } from 'react';
import ReportScreen from './screens/ReportScreen';
import AlertsScreen from './screens/AlertsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import RoadStatusScreen from './screens/RoadStatusScreen';
import SafetyScreen from './screens/SafetyScreen';
import MapScreen from './screens/MapScreen';
import { fetchRegions, fetchAlerts, fetchNotifications, fetchRoadStatus } from './api';

const API_BASE = 'http://192.168.1.5:8000/api/v1';

export default function App() {
  const [activeTab, setActiveTab] = useState('regions');
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [regions, setRegions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [roadStatus, setRoadStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [r, a, n, rd] = await Promise.all([
        fetchRegions(),
        fetchAlerts(),
        fetchNotifications(),
        fetchRoadStatus(),
      ]);
      setRegions(r);
      setAlerts(a);
      setNotifications(n);
      setRoadStatus(rd);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmitReport = async (data) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/citizen/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to submit report');
    const json = await res.json();
    alert(`Report submitted! ID: ${json.report_id}`);
    return json;
  };

  const selectedRegionData = selectedRegion ? regions.find(r => r.region_id === selectedRegion) : null;

  return (
    <div className="citizen-app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <div className="header-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div className="header-title">Landslide Sentinel</div>
              <div className="header-subtitle">Citizen Safety Platform</div>
            </div>
          </div>

          <nav className="header-nav">
            <button className={`nav-link ${activeTab === 'regions' ? 'active' : ''}`} onClick={() => { setActiveTab('regions'); setMobileMenuOpen(false); }}>Regions</button>
            <button className={`nav-link ${activeTab === 'map' ? 'active' : ''}`} onClick={() => { setActiveTab('map'); setMobileMenuOpen(false); }}>Map</button>
            <button className={`nav-link ${activeTab === 'report' ? 'active' : ''}`} onClick={() => { setActiveTab('report'); setMobileMenuOpen(false); }}>Report</button>
            <button className={`nav-link ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => { setActiveTab('alerts'); setMobileMenuOpen(false); }}>Alerts</button>
            <button className={`nav-link ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => { setActiveTab('notifications'); setMobileMenuOpen(false); }}>Notifications</button>
            <button className={`nav-link ${activeTab === 'roads' ? 'active' : ''}`} onClick={() => { setActiveTab('roads'); setMobileMenuOpen(false); }}>Road Status</button>
            <button className={`nav-link ${activeTab === 'safety' ? 'active' : ''}`} onClick={() => { setActiveTab('safety'); setMobileMenuOpen(false); }}>Safety</button>
          </nav>

          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileMenuOpen ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
            </svg>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="mobile-menu">
            <button className={`mobile-nav-link ${activeTab === 'regions' ? 'active' : ''}`} onClick={() => setActiveTab('regions')}>Regions</button>
            <button className={`mobile-nav-link ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>Map</button>
            <button className={`mobile-nav-link ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>Report</button>
            <button className={`mobile-nav-link ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>Alerts</button>
            <button className={`mobile-nav-link ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>Notifications</button>
            <button className={`mobile-nav-link ${activeTab === 'roads' ? 'active' : ''}`} onClick={() => setActiveTab('roads')}>Road Status</button>
            <button className={`mobile-nav-link ${activeTab === 'safety' ? 'active' : ''}`} onClick={() => setActiveTab('safety')}>Safety</button>
          </div>
        )}
      </header>

      <div className="hero-stats">
        <div className="hero-stats-inner">
          <div className="stat-card">
            <div className="stat-icon-row">
              <div className="stat-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
              <div>
                <div className="stat-value">{regions.length}</div>
                <div className="stat-label">Monitored Regions</div>
              </div>
            </div>
            <div className="stat-subtext">Active surveillance zones</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-row">
              <div className="stat-icon" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <div className="stat-value">{alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'SEVERE').length}</div>
                <div className="stat-label">Critical Alerts</div>
              </div>
            </div>
            <div className="stat-subtext">Requires immediate attention</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-row">
              <div className="stat-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div>
                <div className="stat-value">{notifications.length}</div>
                <div className="stat-label">Notifications</div>
              </div>
            </div>
            <div className="stat-subtext">Recent safety advisories</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-row">
              <div className="stat-icon" style={{ background: '#F0FDF4', color: '#16A34A' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              </div>
              <div>
                <div className="stat-value">{roadStatus.filter(r => r.status === 'OPEN').length}/{roadStatus.length}</div>
                <div className="stat-label">Roads Open</div>
              </div>
            </div>
            <div className="stat-subtext">Safe for travel</div>
          </div>
        </div>
      </div>

      <main className="main-content">
        {activeTab === 'regions' && (
          <div className="content-grid">
            <div className="panel">
              <div className="panel-header">
                <h2>Regions</h2>
                <span className="panel-badge">{regions.length} monitored</span>
              </div>
              <div className="regions-grid">
                {regions.length === 0 && !loading && (
                  <div className="empty-state"><p>No region data available.</p></div>
                )}
                {regions.map(region => (
                  <div
                    key={region.region_id}
                    className={`region-card ${selectedRegion === region.region_id ? 'region-card--active' : ''}`}
                    style={{ '--risk-color': getRiskColor(region.risk_level) }}
                    onClick={() => setSelectedRegion(region.region_id)}
                  >
                    <div className="region-card-header">
                      <div className="region-info">
                        <div className="region-name">{region.name}</div>
                        <div className="region-coords">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          {region.latitude.toFixed(4)}, {region.longitude.toFixed(4)}
                        </div>
                      </div>
                      <span className="region-risk-badge" style={{ background: getRiskBg(region.risk_level), color: getRiskText(region.risk_level) }}>
                        {region.risk_level}
                      </span>
                    </div>
                    <div className="region-metrics">
                      <div className="metric">
                        <div className="metric-value">{region.rainfall_mm} mm</div>
                        <div className="metric-label">Rainfall</div>
                      </div>
                      <div className="metric">
                        <div className="metric-value">{region.soil_saturation}%</div>
                        <div className="metric-label">Soil Sat.</div>
                      </div>
                      <div className="metric">
                        <div className="metric-value">{region.slope_angle}°</div>
                        <div className="metric-label">Slope</div>
                      </div>
                      <div className="metric">
                        <div className="metric-value">{region.vibration ? 'Yes' : 'No'}</div>
                        <div className="metric-label">Vibration</div>
                      </div>
                    </div>
                    {region.alert_message && (
                      <div className="region-alert-banner" style={{ background: getRiskBg(region.risk_level), borderColor: getRiskColor(region.risk_level), color: getRiskText(region.risk_level) }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        {region.alert_message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="right-column">
              {selectedRegionData && (
                <div className="panel">
                  <div className="panel-header">
                    <h2>Region Details</h2>
                    <span className="region-risk-badge" style={{ background: getRiskBg(selectedRegionData.risk_level), color: getRiskText(selectedRegionData.risk_level) }}>
                      {selectedRegionData.risk_level}
                    </span>
                  </div>
                  <div className="risk-meters">
                    <div>
                      <div className="meter-header"><span>Rainfall</span><span className="meter-value">{selectedRegionData.rainfall_mm} mm</span></div>
                      <div className="meter-bar"><div className="meter-fill" style={{ width: `${Math.min((selectedRegionData.rainfall_mm / 200) * 100, 100)}%`, background: 'linear-gradient(90deg, #2563EB, #3B82F6)' }} /></div>
                    </div>
                    <div>
                      <div className="meter-header"><span>Soil Saturation</span><span className="meter-value">{selectedRegionData.soil_saturation}%</span></div>
                      <div className="meter-bar"><div className="meter-fill" style={{ width: `${selectedRegionData.soil_saturation}%`, background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' }} /></div>
                    </div>
                    <div>
                      <div className="meter-header"><span>Slope Angle</span><span className="meter-value">{selectedRegionData.slope_angle}°</span></div>
                      <div className="meter-bar"><div className="meter-fill" style={{ width: `${Math.min((selectedRegionData.slope_angle / 45) * 100, 100)}%`, background: 'linear-gradient(90deg, #F59E0B, #FBBF24)' }} /></div>
                    </div>
                    <div>
                      <div className="meter-header"><span>Vibration Detected</span><span className="meter-value">{selectedRegionData.vibration ? 'Yes' : 'No'}</span></div>
                      <div className="meter-bar"><div className="meter-fill" style={{ width: selectedRegionData.vibration ? '100%' : '0%', background: selectedRegionData.vibration ? 'linear-gradient(90deg, #DC2626, #EF4444)' : 'linear-gradient(90deg, #16A34A, #22C55E)' }} /></div>
                    </div>
                  </div>
                  {selectedRegionData.alert_message && (
                    <div className="alert-box" style={{ background: getRiskBg(selectedRegionData.risk_level), borderColor: getRiskColor(selectedRegionData.risk_level), color: getRiskText(selectedRegionData.risk_level) }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      <div>
                        <div className="alert-box-title">Active Alert</div>
                        <div className="alert-box-text">{selectedRegionData.alert_message}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!selectedRegionData && (
                <div className="panel">
                  <div className="panel-header"><h2>Region Details</h2></div>
                  <div className="risk-meters">
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' }}>
                      Select a region to view details
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'map' && <MapScreen regions={regions} selectedRegion={selectedRegion} onSelectRegion={setSelectedRegion} />}
        {activeTab === 'report' && <ReportScreen onSubmit={handleSubmitReport} regions={regions} selectedRegion={selectedRegion} onSelectRegion={setSelectedRegion} />}
        {activeTab === 'alerts' && <AlertsScreen alerts={alerts} />}
        {activeTab === 'notifications' && <NotificationsScreen notifications={notifications} />}
        {activeTab === 'roads' && <RoadStatusScreen roads={roadStatus} />}
        {activeTab === 'safety' && <SafetyScreen />}
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          <span>Landslide Sentinel — Citizen Safety Platform. Real-time monitoring powered by GIS and AI.</span>
        </div>
      </footer>
    </div>
  );
}

function getRiskColor(level) {
  const colors = { LOW: '#16A34A', MODERATE: '#D97706', HIGH: '#EA580C', CRITICAL: '#DC2626', SEVERE: '#7C2D12' };
  return colors[level] || '#64748B';
}
function getRiskBg(level) {
  const bgs = { LOW: '#DCFCE7', MODERATE: '#FEF3C7', HIGH: '#FFEDD5', CRITICAL: '#FEE2E2', SEVERE: '#FECACA' };
  return bgs[level] || '#F1F5F9';
}
function getRiskText(level) {
  const texts = { LOW: '#166534', MODERATE: '#92400E', HIGH: '#9A3412', CRITICAL: '#991B1B', SEVERE: '#7C2D12' };
  return texts[level] || '#475569';
}
