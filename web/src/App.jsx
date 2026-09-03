import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AlertTriangle, BellRing, FileText, MapPinned, RefreshCw, ShieldCheck } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import CitizenDashboard from './pages/CitizenDashboard';
import { AlertBadge } from './components/UI';
import { getAlerts, getRegions, getReports, getRiskStatus } from './services/api';
import { idbService } from './services/db';
import './App.css';

const EmptyState = ({ icon: Icon, title, children }) => (
  <section className="glass-panel empty-state">
    <Icon size={34} />
    <h2 className="heading-md">{title}</h2>
    <p className="text-muted">{children}</p>
  </section>
);

function RegionsPage() {
  const [regions, setRegions] = React.useState([]);
  const [risk, setRisk] = React.useState({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // 1. Instant load from IndexedDB
    Promise.all([idbService.getCachedRegions(), idbService.getCachedRiskStatuses()]).then(([cachedRegs, cachedRisk]) => {
      if (cachedRegs && cachedRegs.length > 0) {
        setRegions(cachedRegs);
        setRisk(cachedRisk || {});
        setLoading(false);
      }
    });

    // 2. Fetch from backend and update IndexedDB
    getRegions()
      .then(async (items) => {
        setRegions(items);
        await idbService.saveRegions(items);
        const results = await Promise.all(
          items.map(async (region) => {
            try {
              return [region.id, await getRiskStatus(region.id)];
            } catch {
              return [region.id, null];
            }
          })
        );
        const resolved = Object.fromEntries(results.filter(([, v]) => v !== null));
        setRisk(resolved);
        await idbService.saveRiskStatuses(resolved);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading && regions.length === 0) {
    return <EmptyState icon={RefreshCw} title="Loading regions">Retrieving monitored-region data.</EmptyState>;
  }

  return (
    <section className="glass-panel table-panel">
      <h2 className="heading-md">Monitored regions</h2>
      <p className="text-muted panel-intro">Live model status for each configured location (IndexedDB cached).</p>
      {regions.length ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Region</th>
                <th>Coordinates</th>
                <th>Risk</th>
                <th>Data status</th>
                <th>Latest indicator</th>
              </tr>
            </thead>
            <tbody>
              {regions.map((region) => {
                const item = risk[region.id];
                const alert = item?.current_alert;
                return (
                  <tr key={region.id}>
                    <td className="highlight">{region.name}</td>
                    <td>
                      {region.latitude.toFixed(4)}, {region.longitude.toFixed(4)}
                    </td>
                    <td>{alert ? <AlertBadge level={alert.risk_level} /> : <span className="badge badge-success">Normal</span>}</td>
                    <td>{item?.data_status || 'UNAVAILABLE'}</td>
                    <td>{alert?.reason || 'No active warning'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={MapPinned} title="No regions yet">
          Add monitored regions through the API to display them here.
        </EmptyState>
      )}
    </section>
  );
}

function AlertsPage() {
  const [alerts, setAlerts] = React.useState([]);

  React.useEffect(() => {
    idbService.getCachedAlerts().then((cached) => {
      if (cached && cached.length > 0) setAlerts(cached);
    });
    getAlerts()
      .then(async (items) => {
        setAlerts(items);
        await idbService.saveAlerts(items);
      })
      .catch(() => {});
  }, []);

  return (
    <section className="glass-panel table-panel">
      <h2 className="heading-md">Active alerts</h2>
      <p className="text-muted panel-intro">Warnings issued by the landslide decision engine (IndexedDB cached).</p>
      {alerts.length ? (
        <div className="alert-stack">
          {alerts.map((alert) => (
            <article className="alert-row" key={alert.id}>
              <AlertTriangle size={20} />
              <div>
                <strong>Region #{alert.region_id}</strong>
                <p>{alert.reason}</p>
                <small>{new Date(alert.timestamp).toLocaleString()}</small>
              </div>
              <AlertBadge level={alert.risk_level} />
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon={BellRing} title="No alerts recorded">
          The warning feed is clear.
        </EmptyState>
      )}
    </section>
  );
}

function ReportsPage() {
  const [reports, setReports] = React.useState([]);

  React.useEffect(() => {
    idbService.getCachedReports().then((cached) => {
      if (cached && cached.length > 0) setReports(cached);
    });
    getReports()
      .then(async (items) => {
        setReports(items);
        await idbService.saveReports(items);
      })
      .catch(() => {});
  }, []);

  return (
    <section className="glass-panel table-panel">
      <h2 className="heading-md">Citizen reports</h2>
      <p className="text-muted panel-intro">Incoming on-ground reports, including offline submissions once synced.</p>
      {reports.length ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Region</th>
                <th>Category</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="highlight">{report.description}</td>
                  <td>Region #{report.region_id}</td>
                  <td>{report.hazard_type}</td>
                  <td>
                    <span className="badge badge-info">{report.status}</span>
                  </td>
                  <td>{new Date(report.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={FileText} title="No citizen reports">
          Reports submitted from the app will appear here.
        </EmptyState>
      )}
    </section>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Header />
          <Routes>
            <Route path="/" element={<CitizenDashboard />} />
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/regions" element={<RegionsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Routes>
          <footer className="app-footer">
            <ShieldCheck size={15} /> Landslide Early Warning System · Government of India
          </footer>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
