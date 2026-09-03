import React, { useEffect, useState } from 'react';
import { getHealth } from '../services/api';
import { Activity, ServerCrash } from 'lucide-react';

const Header = () => {
  const [healthStatus, setHealthStatus] = useState('Checking...');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await getHealth();
        setIsOnline(true);
        // If any service is not connected, we show a warning
        const anyOffline = health.some(h => h.status !== 'CONNECTED');
        setHealthStatus(anyOffline ? 'Degraded' : 'All Systems Operational');
      } catch (err) {
        setIsOnline(false);
        setHealthStatus('Backend Offline');
      }
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="dashboard-header animate-fade-in">
      <div>
        <h1 className="heading-md">Admin Dashboard</h1>
        <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
          Real-time monitoring and analytics
        </p>
      </div>
      
      <div className="header-actions">
        <div className={`badge ${isOnline ? 'badge-success' : 'badge-danger'}`} style={{ gap: '0.5rem', display: 'flex', alignItems: 'center' }}>
          {isOnline ? <Activity size={14} /> : <ServerCrash size={14} />}
          {healthStatus}
        </div>
      </div>
    </header>
  );
};

export default Header;
