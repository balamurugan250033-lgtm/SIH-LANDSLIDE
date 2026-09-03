import React, { useEffect, useState } from 'react';
import { getRegions, getAlerts, getReports } from '../services/api';
import { StatCard, AlertBadge } from '../components/UI';
import { Map, BellRing, FileWarning, ShieldAlert } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    regions: 0,
    alerts: 0,
    reports: 0,
    criticalAlerts: 0
  });
  
  const [recentAlerts, setRecentAlerts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [regions, alerts, reports] = await Promise.all([
          getRegions(),
          getAlerts(),
          getReports()
        ]);
        
        const critical = alerts.filter(a => a.risk_level === 'CRITICAL').length;
        
        setStats({
          regions: regions.length,
          alerts: alerts.length,
          reports: reports.length,
          criticalAlerts: critical
        });
        
        setRecentAlerts(alerts.slice(0, 5));
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-4 gap-6" style={{ marginBottom: '2rem' }}>
        <StatCard 
          title="Monitored Regions" 
          value={stats.regions} 
          icon={Map} 
          color="#3B82F6" 
          delay={0}
        />
        <StatCard 
          title="Active Alerts" 
          value={stats.alerts} 
          icon={BellRing} 
          color="#F59E0B" 
          delay={100}
        />
        <StatCard 
          title="Citizen Reports" 
          value={stats.reports} 
          icon={FileWarning} 
          color="#8B5CF6" 
          delay={200}
        />
        <StatCard 
          title="Critical Risk" 
          value={stats.criticalAlerts} 
          icon={ShieldAlert} 
          color="#EF4444" 
          delay={300}
        />
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', animationDelay: '400ms' }}>
        <h3 className="heading-md" style={{ marginBottom: '1.5rem' }}>Recent System Alerts</h3>
        
        {recentAlerts.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Region ID</th>
                <th>Risk Level</th>
                <th>Score</th>
                <th>Reason</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentAlerts.map((alert) => (
                <tr key={alert.id}>
                  <td className="highlight">Region #{alert.region_id}</td>
                  <td><AlertBadge level={alert.risk_level} /></td>
                  <td>{(alert.risk_score * 100).toFixed(1)}%</td>
                  <td>{alert.reason}</td>
                  <td>{new Date(alert.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted" style={{ padding: '2rem', textAlign: 'center' }}>
            No recent alerts to display.
          </p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
