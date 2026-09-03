import React from 'react';

export const StatCard = ({ title, value, icon: Icon, color = 'var(--accent-primary)', delay = 0 }) => {
  return (
    <div 
      className="glass-card animate-fade-in" 
      style={{ animationDelay: `${delay}ms` }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="stat-label">{title}</div>
          <div className="stat-value text-gradient">{value}</div>
        </div>
        <div style={{ 
          padding: '0.75rem', 
          background: `rgba(255,255,255,0.05)`, 
          borderRadius: 'var(--radius-sm)',
          color: color
        }}>
          {Icon && <Icon size={24} />}
        </div>
      </div>
    </div>
  );
};

export const AlertBadge = ({ level }) => {
  const getBadgeClass = () => {
    switch (level) {
      case 'CRITICAL': return 'badge-danger';
      case 'HIGH': return 'badge-warning';
      case 'MODERATE': return 'badge-info';
      case 'LOW': return 'badge-success';
      default: return 'badge-info';
    }
  };

  return (
    <span className={`badge ${getBadgeClass()}`}>
      {level}
    </span>
  );
};

export const RiskLevelBadge = ({ level }) => {
  const getBadgeClass = () => {
    switch (level) {
      case 'CRITICAL': return 'badge-danger';
      case 'HIGH': return 'badge-warning';
      case 'MODERATE': return 'badge-info';
      case 'LOW': return 'badge-success';
      default: return 'badge-info';
    }
  };

  return (
    <span className={`badge ${getBadgeClass()}`}>
      {level || 'LOW'}
    </span>
  );
};
