import { useState, useEffect } from 'react';
import ReportScreen from './screens/ReportScreen';
import AlertsScreen from './screens/AlertsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import RoadStatusScreen from './screens/RoadStatusScreen';
import SafetyScreen from './screens/SafetyScreen';
import MapScreen from './screens/MapScreen';
import { fetchRegions, fetchAlerts, fetchNotifications, fetchRoadStatus, fetchHealth, submitReport } from './api';
import CitizenCommandCenter from './components/CitizenCommandCenter';

export default function App() {
  const [activeTab, setActiveTab] = useState('regions');
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [regions, setRegions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [roadStatus, setRoadStatus] = useState([]);
  const [regionsSource, setRegionsSource] = useState('cached');
  const [sourceHealth, setSourceHealth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            if (msg.type === 'new_alert' && msg.data) {
              setAlerts(prev => [msg.data, ...prev.slice(0, 49)]);
              setRegions(prev => prev.map(r => (r.region_id === msg.data.region_id || r.id === msg.data.region_id)
                ? { ...r, risk_level: msg.data.risk_level || msg.data.severity, alert_message: msg.data.reason }
                : r));
            } else if (msg.type === 'new_notification' && msg.data) {
              setNotifications(prev => [msg.data, ...prev.slice(0, 49)]);
            } else if (msg.type === 'new_report') {
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
  }, []);

  async function loadData() {
    try {
      const [r, a, n, rd, health] = await Promise.all([
        fetchRegions(),
        fetchAlerts(),
        fetchNotifications(),
        fetchRoadStatus(),
        fetchHealth(),
      ]);
      setRegions(r);
      setRegionsSource(r.source || 'cached');
      setAlerts(a);
      setNotifications(n);
      setRoadStatus(rd);
      setSourceHealth(health);
      if (!selectedRegion && r && r.length > 0) {
        setSelectedRegion(r[0].region_id || r[0].id);
      }
    } catch (err) {
      console.error('Failed to load citizen platform data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmitReport = async (data) => {
    const result = await submitReport(data);
    await loadData();
    return result;
  };

  const selectedRegionData = selectedRegion ? regions.find(r => (r.region_id === selectedRegion || r.id === selectedRegion)) : regions[0];

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
              <div className="header-title">T-MINUS</div>
              <div className="header-subtitle">Citizen Early Warning & Safety System</div>
            </div>
          </div>

          <nav className="header-nav">
            <button className={`nav-link ${activeTab === 'regions' ? 'active' : ''}`} onClick={() => { setActiveTab('regions'); setMobileMenuOpen(false); }}>Regions</button>
            <button className={`nav-link ${activeTab === 'map' ? 'active' : ''}`} onClick={() => { setActiveTab('map'); setMobileMenuOpen(false); }}>GIS Map</button>
            <button className={`nav-link ${activeTab === 'report' ? 'active' : ''}`} onClick={() => { setActiveTab('report'); setMobileMenuOpen(false); }}>Submit Report</button>
            <button className={`nav-link ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => { setActiveTab('alerts'); setMobileMenuOpen(false); }}>Alerts</button>
            <button className={`nav-link ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => { setActiveTab('notifications'); setMobileMenuOpen(false); }}>Advisories</button>
            <button className={`nav-link ${activeTab === 'roads' ? 'active' : ''}`} onClick={() => { setActiveTab('roads'); setMobileMenuOpen(false); }}>Road Status</button>
            <button className={`nav-link ${activeTab === 'safety' ? 'active' : ''}`} onClick={() => { setActiveTab('safety'); setMobileMenuOpen(false); }}>Safety & Helplines</button>
          </nav>

          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileMenuOpen ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
            </svg>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="mobile-menu">
            <button className={`mobile-nav-link ${activeTab === 'regions' ? 'active' : ''}`} onClick={() => { setActiveTab('regions'); setMobileMenuOpen(false); }}>Regions</button>
            <button className={`mobile-nav-link ${activeTab === 'map' ? 'active' : ''}`} onClick={() => { setActiveTab('map'); setMobileMenuOpen(false); }}>GIS Map</button>
            <button className={`mobile-nav-link ${activeTab === 'report' ? 'active' : ''}`} onClick={() => { setActiveTab('report'); setMobileMenuOpen(false); }}>Submit Report</button>
            <button className={`mobile-nav-link ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => { setActiveTab('alerts'); setMobileMenuOpen(false); }}>Alerts</button>
            <button className={`mobile-nav-link ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => { setActiveTab('notifications'); setMobileMenuOpen(false); }}>Advisories</button>
            <button className={`mobile-nav-link ${activeTab === 'roads' ? 'active' : ''}`} onClick={() => { setActiveTab('roads'); setMobileMenuOpen(false); }}>Road Status</button>
            <button className={`mobile-nav-link ${activeTab === 'safety' ? 'active' : ''}`} onClick={() => { setActiveTab('safety'); setMobileMenuOpen(false); }}>Safety & Helplines</button>
          </div>
        )}
      </header>

      {activeTab !== 'regions' && <div className="hero-stats">
        <div className="hero-stats-inner">
          <div className="stat-card">
            <div className="stat-icon-row">
              <div className="stat-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
              <div>
                <div className="stat-value">{regions.length}</div>
                <div className="stat-label">Monitored Zones</div>
              </div>
            </div>
            <div className="stat-subtext">Active NER sensor networks</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-row">
              <div className="stat-icon" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <div className="stat-value">{alerts.filter(a => ['CRITICAL', 'SEVERE'].includes(a.severity || a.risk_level)).length}</div>
                <div className="stat-label">High/Critical Alerts</div>
              </div>
            </div>
            <div className="stat-subtext">Requires immediate caution</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-row">
              <div className="stat-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div>
                <div className="stat-value">{notifications.length}</div>
                <div className="stat-label">Broadcast Bulletins</div>
              </div>
            </div>
            <div className="stat-subtext">SMS, Siren & Mesh relays</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-row">
              <div className="stat-icon" style={{ background: '#F0FDF4', color: '#16A34A' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              </div>
              <div>
                <div className="stat-value">{roadStatus.filter(r => r.status === 'open').length}/{roadStatus.length || 5}</div>
                <div className="stat-label">Open Highways</div>
              </div>
            </div>
            <div className="stat-subtext">Safe transit corridors</div>
          </div>
        </div>
      </div>}

      <main className="main-content">
        {loading && <div className="sync-banner" role="status"><span className="spinner spinner--dark" /> Synchronising current regional data...</div>}
        {activeTab === 'regions' && (
          <CitizenCommandCenter
            regions={regions}
            alerts={alerts}
            notifications={notifications}
            roadStatus={roadStatus}
            regionsSource={regionsSource}
            sourceHealth={sourceHealth}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === 'regions' && false && (
          <div className="content-grid">
            <div className="panel">
              <div className="panel-header">
                <h2>Monitored NER Regions</h2>
                <span className="panel-badge">{regions.length} locations</span>
              </div>
              <div className="regions-grid">
                {regions.length === 0 && !loading && (
                  <div className="empty-state"><p>No monitored region data available.</p></div>
                )}
                {regions.map(region => {
                  const regId = region.region_id || region.id;
                  const isSelected = selectedRegion === regId;
                  const riskLvl = region.risk_level || 'LOW';
                  return (
                    <div
                      key={regId}
                      className={`region-card ${isSelected ? 'region-card--active' : ''}`}
                      style={{ '--risk-color': getRiskColor(riskLvl) }}
                      onClick={() => setSelectedRegion(regId)}
                    >
                      <div className="region-card-header">
                        <div className="region-info">
                          <div className="region-name">{region.name}</div>
                          <div className="region-coords">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            {Number(region.latitude).toFixed(3)}, {Number(region.longitude).toFixed(3)}
                          </div>
                        </div>
                        <span className="region-risk-badge" style={{ background: getRiskBg(riskLvl), color: getRiskText(riskLvl) }}>
                          {riskLvl}
                        </span>
                      </div>
                      <div className="region-metrics">
                        <div className="metric">
                          <div className="metric-value">{region.rainfall_mm ?? '--'} mm</div>
                          <div className="metric-label">Rainfall</div>
                        </div>
                        <div className="metric">
                          <div className="metric-value">{region.soil_saturation ?? '--'}%</div>
                          <div className="metric-label">Soil Sat.</div>
                        </div>
                        <div className="metric">
                          <div className="metric-value">{region.slope_angle ?? '--'}°</div>
                          <div className="metric-label">Slope</div>
                        </div>
                        <div className="metric">
                          <div className="metric-value">{region.vibration ? 'Detected' : 'Stable'}</div>
                          <div className="metric-label">Vibration</div>
                        </div>
                      </div>
                      {region.alert_message && (
                        <div className="region-alert-banner" style={{ background: getRiskBg(riskLvl), borderColor: getRiskColor(riskLvl), color: getRiskText(riskLvl) }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                          {region.alert_message}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="right-column">
              {selectedRegionData && (
                <div className="panel">
                  <div className="panel-header">
                    <h2>{selectedRegionData.name}</h2>
                    <span className="region-risk-badge" style={{ background: getRiskBg(selectedRegionData.risk_level), color: getRiskText(selectedRegionData.risk_level) }}>
                      {selectedRegionData.risk_level} Risk
                    </span>
                  </div>
                  <div className="risk-meters">
                    <div>
                      <div className="meter-header"><span>24h Cumulative Rainfall</span><span className="meter-value">{selectedRegionData.rainfall_mm ?? 0} mm</span></div>
                      <div className="meter-bar"><div className="meter-fill" style={{ width: `${Math.min(((selectedRegionData.rainfall_mm || 0) / 200) * 100, 100)}%`, background: 'linear-gradient(90deg, #2563EB, #3B82F6)' }} /></div>
                    </div>
                    <div>
                      <div className="meter-header"><span>Soil Saturation Index</span><span className="meter-value">{selectedRegionData.soil_saturation ?? 0}%</span></div>
                      <div className="meter-bar"><div className="meter-fill" style={{ width: `${selectedRegionData.soil_saturation || 0}%`, background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' }} /></div>
                    </div>
                    <div>
                      <div className="meter-header"><span>Terrain Slope Angle</span><span className="meter-value">{selectedRegionData.slope_angle ?? 0}°</span></div>
                      <div className="meter-bar"><div className="meter-fill" style={{ width: `${Math.min(((selectedRegionData.slope_angle || 0) / 50) * 100, 100)}%`, background: 'linear-gradient(90deg, #F59E0B, #FBBF24)' }} /></div>
                    </div>
                    <div>
                      <div className="meter-header"><span>Seismic Vibration Activity</span><span className="meter-value">{selectedRegionData.vibration ? 'Detected (High Alert)' : 'Normal / Quiet'}</span></div>
                      <div className="meter-bar"><div className="meter-fill" style={{ width: selectedRegionData.vibration ? '100%' : '15%', background: selectedRegionData.vibration ? 'linear-gradient(90deg, #DC2626, #EF4444)' : 'linear-gradient(90deg, #16A34A, #22C55E)' }} /></div>
                    </div>
                  </div>
                  {selectedRegionData.alert_message && (
                    <div className="alert-box" style={{ background: getRiskBg(selectedRegionData.risk_level), borderColor: getRiskColor(selectedRegionData.risk_level), color: getRiskText(selectedRegionData.risk_level), marginTop: '1.25rem' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      <div>
                        <div className="alert-box-title">Active Advisory</div>
                        <div className="alert-box-text">{selectedRegionData.alert_message}</div>
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-primary" style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 600, cursor: 'pointer' }} onClick={() => setActiveTab('report')}>
                      Report Hazard Here
                    </button>
                    <button className="btn btn-secondary" style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', fontWeight: 600, cursor: 'pointer' }} onClick={() => setActiveTab('map')}>
                      View on Map
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'map' && <MapScreen regions={regions} selectedRegion={selectedRegion} onSelectRegion={setSelectedRegion} />}
        {activeTab === 'report' && <ReportScreen onSubmit={handleSubmitReport} regions={regions} selectedRegion={selectedRegion} onSelectRegion={setSelectedRegion} />}
        {activeTab === 'alerts' && <AlertsScreen alerts={alerts} regions={regions} />}
        {activeTab === 'notifications' && <NotificationsScreen notifications={notifications} regions={regions} />}
        {activeTab === 'roads' && <RoadStatusScreen roads={roadStatus} />}
        {activeTab === 'safety' && <SafetyScreen />}
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          <span>T-MINUS — North-Eastern Region Early Warning Network. Powered by AI & IoT Telemetry.</span>
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
