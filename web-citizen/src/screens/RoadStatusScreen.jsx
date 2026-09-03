const STATUS_STYLES = {
  OPEN: { cls: 'road-open', badge: 'road-status-open', label: 'Open' },
  AT_RISK: { cls: 'road-at_risk', badge: 'road-status-at_risk', label: 'At Risk' },
  BLOCKED: { cls: 'road-blocked', badge: 'road-status-blocked', label: 'Blocked' },
};

export default function RoadStatusScreen({ roads: initialRoads }) {
  const [roads, setRoads] = useState(initialRoads || []);
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? roads : roads.filter(r => r.status === filter);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19h16"/><path d="M4 15l4-8h8l4 8"/><circle cx="8" cy="19" r="2"/><circle cx="16" cy="19" r="2"/></svg>
          Road Status
        </h2>
        <span className="panel-badge">{filtered.length} roads</span>
      </div>
      <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['all', 'OPEN', 'AT_RISK', 'BLOCKED'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`nav-link ${filter === f ? 'active' : ''}`} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
            {f === 'all' ? 'All' : STATUS_STYLES[f]?.label || f}
          </button>
        ))}
      </div>
      <div className="road-list">
        {filtered.length === 0 && (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <p>No road data available.</p>
          </div>
        )}
        {filtered.map((road, i) => {
          const style = STATUS_STYLES[road.status] || STATUS_STYLES.OPEN;
          return (
            <div key={i} className={`road-card ${style.cls}`}>
              <div className="road-header">
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{road.road_name || road.road_id}</div>
                <span className={`road-status-badge ${style.badge}`}>{style.label}</span>
              </div>
              <div className="road-reason">{road.reason || 'No specific hazards reported.'}</div>
              {road.alternate_route && (
                <div className="road-alt">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                  Alternate: {road.alternate_route}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
