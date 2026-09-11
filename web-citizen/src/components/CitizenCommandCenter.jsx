import { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowUpRight, BellRing, CheckCircle2, ChevronRight,
  CloudRain, Compass, Gauge, Map, MapPin, Radio, Satellite, ShieldAlert,
  Siren, Smartphone, Users, WifiOff, X,
} from 'lucide-react';
import { NER_STATES, regionBelongsToState } from '../data/nerRegions';
import { fetchCitizenRiskTrend } from '../api';

const RISK = {
  LOW: { color: '#15803D', bg: '#DCFCE7' },
  MODERATE: { color: '#A16207', bg: '#FEF3C7' },
  HIGH: { color: '#C2410C', bg: '#FFEDD5' },
  CRITICAL: { color: '#B91C1C', bg: '#FEE2E2' },
  SEVERE: { color: '#7F1D1D', bg: '#FECACA' },
};

function RiskBadge({ level = 'HIGH' }) {
  const style = RISK[level] || { color: '#64748B', bg: '#F1F5F9' };
  return <span className="sentinel-risk-badge" style={{ color: style.color, background: style.bg }}>{level}</span>;
}

function SectionHeader({ eyebrow, title, action, onAction }) {
  return <div className="sentinel-section-head">
    <div><div className="sentinel-eyebrow">{eyebrow}</div><h2>{title}</h2></div>
    {action && <button className="sentinel-link-button" onClick={onAction}>{action}<ArrowUpRight size={15} /></button>}
  </div>;
}

function MetricCard({ icon: Icon, label, value, detail, tone = 'blue' }) {
  return <article className={`sentinel-metric sentinel-metric--${tone}`}>
    <div className="sentinel-metric-icon"><Icon size={18} /></div>
    <div><strong>{value}</strong><span>{label}</span><small>{detail}</small></div>
  </article>;
}

export default function CitizenCommandCenter({ regions = [], alerts = [], notifications = [], roadStatus = [], regionsSource = 'cached', sourceHealth = [], onNavigate }) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [language, setLanguage] = useState('English');
  const [selectedState, setSelectedState] = useState(null);
  const [riskTrend, setRiskTrend] = useState(null);
  const stateRegions = selectedState ? regions.filter((region) => regionBelongsToState(region, selectedState)) : regions;
  const selectedRegion = stateRegions[0];
  const highAlerts = alerts.filter((alert) => ['HIGH', 'CRITICAL', 'SEVERE'].includes(alert.severity || alert.risk_level));
  const openRoads = roadStatus.filter((road) => String(road.status).toUpperCase() === 'OPEN').length;
  const currentAlert = alerts.find((alert) => alert.region_id === selectedRegion?.region_id || alert.region_id === selectedRegion?.id);
  const currentRisk = useMemo(() => selectedRegion?.risk_score != null ? Math.round(selectedRegion.risk_score * 100) : (currentAlert?.risk_score != null ? Math.round(currentAlert.risk_score * 100) : null), [selectedRegion, currentAlert]);
  const currentLevel = currentRisk == null ? 'UNAVAILABLE' : (currentAlert?.risk_level || selectedRegion?.risk_level || 'UNAVAILABLE');
  useEffect(() => {
    let cancelled = false;
    fetchCitizenRiskTrend(selectedRegion?.region_id || selectedRegion?.id).then((data) => { if (!cancelled) setRiskTrend(data); }).catch(() => { if (!cancelled) setRiskTrend(null); });
    return () => { cancelled = true; };
  }, [selectedRegion?.region_id, selectedRegion?.id, selectedRegion?.updated_at, selectedRegion?.timestamp]);
  const trendPoints = riskTrend?.points || [];
  const trendPolyline = trendPoints.length ? trendPoints.map((point, index) => `${(index / Math.max(1, trendPoints.length - 1)) * 100},${96 - Number(point.risk_score || 0) * 92}`).join(' ') : '';
  const trendAnalysis = useMemo(() => {
    if (!trendPoints.length) return null;
    const scores = trendPoints.map((point) => Math.round(Number(point.risk_score || 0) * 100));
    const first = scores[0];
    const latest = scores.at(-1);
    const peak = Math.max(...scores);
    const direction = riskTrend?.direction?.replaceAll('_', ' ') || (latest > first ? 'RISING' : latest < first ? 'FALLING' : 'STABLE');
    return { first, latest, peak, change: latest - first, direction };
  }, [riskTrend, trendPoints]);
  const connectionLabel = regionsSource === 'api' ? 'Connected' : 'Cached data';
  const sourceStatus = (name) => sourceHealth.find((source) => source.source_name === name)?.status || 'UNAVAILABLE';
  const sourceSync = (name) => sourceHealth.find((source) => source.source_name === name)?.last_sync;
  const healthCards = [['LIVE WEATHER & SOIL', 'OPEN_METEO'], ['NER SENSOR NETWORK', 'SENSOR_NETWORK'], ['GIS / TERRAIN DATA', 'GIS'], ['SATELLITE DATA', 'SATELLITE'], ['CITIZEN REPORT NETWORK', 'CITIZEN_REPORTS']];
  const analysis = {
    location: selectedRegion?.name || (selectedState ? `${selectedState} data unavailable` : 'Select a NER state'),
    confidence: currentAlert?.risk_score ? Math.min(99, Math.round(78 + currentRisk / 8)) : null,
    window: currentRisk == null ? 'Prediction unavailable' : currentLevel === 'LOW' ? 'No elevated risk window' : 'Next 6–12 hours',
    factors: [
      ['24h Rainfall', `${selectedRegion?.rainfall_mm ?? '--'} mm`, selectedRegion?.rainfall_mm ? Math.min(100, Number(selectedRegion.rainfall_mm) / 1.5) : 0, selectedRegion?.rainfall_mm ? 'LIVE INPUT' : 'DATA UNAVAILABLE'],
      ['Soil Saturation', `${selectedRegion?.soil_saturation ?? '--'}%`, selectedRegion?.soil_saturation || 0, selectedRegion?.soil_saturation ? 'LIVE INPUT' : 'DATA UNAVAILABLE'],
      ['Terrain Slope', `${selectedRegion?.slope_angle ?? '--'}°`, selectedRegion?.slope_angle ? Math.min(100, Number(selectedRegion.slope_angle) * 2) : 0, selectedRegion?.slope_angle ? 'LIVE INPUT' : 'DATA UNAVAILABLE'],
      ['Ground Vibration', selectedRegion?.vibration ? 'Detected' : 'Unavailable', selectedRegion?.vibration ? 72 : 0, selectedRegion?.vibration ? 'LIVE INPUT' : 'DATA UNAVAILABLE'],
      ['Alert history', currentAlert ? 'Active' : 'None', currentAlert ? 76 : 12, currentAlert ? 'HIGH IMPACT' : 'LOW IMPACT'],
    ],
  };
  const explainableFactors = [
    ['Rainfall', selectedRegion?.rainfall_mm ? Math.min(100, Number(selectedRegion.rainfall_mm) / 1.5) : 0, selectedRegion?.rainfall_mm ? 'OBSERVED' : 'UNAVAILABLE'],
    ['Soil moisture', selectedRegion?.soil_saturation || 0, selectedRegion?.soil_saturation ? 'OBSERVED' : 'UNAVAILABLE'],
    ['Slope', selectedRegion?.slope_angle ? Math.min(100, Number(selectedRegion.slope_angle) * 2) : 0, selectedRegion?.slope_angle ? 'OBSERVED' : 'UNAVAILABLE'],
    ['Vibration', selectedRegion?.vibration ? 72 : 0, selectedRegion?.vibration ? 'OBSERVED' : 'UNAVAILABLE'],
    ['Alert history', currentAlert ? 76 : 0, currentAlert ? 'OBSERVED' : 'UNAVAILABLE'],
  ];

  return <div className="sentinel-command-center">
    <section className="sentinel-hero">
      <div>
        <div className="sentinel-hero-kicker"><span className="sentinel-live-dot" /> NORTH EASTERN REGION EARLY WARNING NETWORK <span className="sentinel-live-label">DATA-AWARE PROTOTYPE</span></div>
        <h1>North Eastern Region landslide intelligence.</h1>
        <p>T-MINUS combines environmental signals, explainable AI, GIS context and citizen reports for low-connectivity regions.</p>
        <div className="sentinel-hero-actions"><button className="sentinel-primary-button" onClick={() => onNavigate('map')}><Map size={17} /> Open GIS risk map</button><button className="sentinel-secondary-button" onClick={() => onNavigate('report')}><Siren size={17} /> Report a hazard</button></div>
      </div>
      <div className="sentinel-hero-status"><div className="sentinel-status-label"><Radio size={16} /> NETWORK STATUS</div><strong>{connectionLabel}</strong><span>{regionsSource === 'api' ? 'Latest region data received · Offline queue ready' : 'Backend unavailable · Offline queue ready'}</span><div className="sentinel-sync-line"><span /><span /><span /><span /><span /></div></div>
    </section>

    <div className="sentinel-demo-bar sentinel-live-bar"><div><Activity size={17} /><strong>Live telemetry connection</strong><span>{regionsSource === 'api' ? 'Connected to the Landslide Sentinel API and monitoring current region data.' : 'Backend unavailable; showing the last cached operational state.'}</span></div><span className="sentinel-connection-state"><i />{regionsSource === 'api' ? 'CONNECTED' : 'CACHED'}</span></div>

    <section className="sentinel-metrics-grid">
      <MetricCard icon={Gauge} label="Current regional risk" value={currentRisk == null ? '--' : `${currentRisk}%`} detail={currentRisk == null ? 'DATA UNAVAILABLE' : 'Backend risk decision'} tone="orange" />
      <MetricCard icon={AlertTriangle} label="High / critical alerts" value={highAlerts.length} detail="Current alert feed" tone="red" />
      <MetricCard icon={BellRing} label="Broadcast bulletins" value={notifications.length} detail="Current notification feed" tone="blue" />
      <MetricCard icon={Compass} label="Open highways" value={`${openRoads} / ${roadStatus.length}`} detail="Current road-status feed" tone="green" />
    </section>

    <section className="sentinel-panel sentinel-state-selector"><SectionHeader eyebrow="NER-WIDE COVERAGE" title="Select state or view all monitored regions" /><div className="sentinel-state-chips"><button className={!selectedState ? 'is-selected' : ''} onClick={() => setSelectedState(null)}>ALL NER</button>{NER_STATES.map((state) => <button key={state} className={selectedState === state ? 'is-selected' : ''} onClick={() => setSelectedState(state)}>{state}</button>)}</div><div className="sentinel-state-summary">{NER_STATES.map((state) => { const count = regions.filter((region) => regionBelongsToState(region, state)).length; return <span key={state}><b>{state}</b>{count ? `${count} monitored location${count > 1 ? 's' : ''}` : 'DATA UNAVAILABLE'}</span>; })}</div></section>

    <section className="sentinel-panel sentinel-data-center"><SectionHeader eyebrow="LIVE DATA CENTER" title="Source health and freshness" /><div className="sentinel-source-grid">{healthCards.map(([label, key]) => { const status = sourceStatus(key); const sync = sourceSync(key); return <div className="sentinel-source-card" key={key}><div><strong>{label}</strong><span className={`sentinel-source-status sentinel-source-status--${status.toLowerCase()}`}><i />{status.replaceAll('_', ' ')}</span></div><small>{sync ? `Last successful update: ${new Date(sync).toLocaleString()}` : status === 'INTEGRATION_PENDING' ? 'Integration pending' : 'No successful update recorded'}</small></div>; })}</div></section>

    <section className="sentinel-risk-grid">
      <article className="sentinel-panel sentinel-prediction-panel">
        <SectionHeader eyebrow="AI LANDSLIDE RISK PREDICTION" title={analysis.location} action="View AI analysis" onAction={() => setShowAnalysis(true)} />
        <div className="sentinel-risk-summary"><div><RiskBadge level={currentLevel} /><div className="sentinel-score"><strong>{currentRisk == null ? '--' : currentRisk}</strong><span>/ 100<br />AI risk score</span></div></div><div className="sentinel-prediction-meta"><span>{currentRisk == null ? 'DATA UNAVAILABLE' : currentLevel === 'LOW' ? 'MONITORING' : 'EARLY WARNING'}</span><strong>{analysis.window}</strong><small>Model confidence <b>{analysis.confidence ? `${analysis.confidence}%` : 'Unavailable'}</b></small></div></div>
        <div className="sentinel-factor-list">{analysis.factors.map(([label, value, percent, impact]) => <div className="sentinel-factor" key={label}><div><span>{label}</span><b>{value}</b></div><div className="sentinel-progress"><span style={{ width: `${percent}%` }} /></div><small className={impact === 'MEDIUM IMPACT' ? 'medium' : ''}>{impact}</small></div>)}</div>
        <div className="sentinel-prototype-note"><ShieldAlert size={16} /><span>{currentRisk == null ? 'Validated ML prediction unavailable. Showing source observations only.' : 'Current score is an observed decision-support value. A validated historical-event ML model is not deployed.'}</span></div>
      </article>
      <article className="sentinel-panel sentinel-explain-panel"><SectionHeader eyebrow="EXPLAINABLE RISK" title="Why is this area at risk?" /><div className="sentinel-explanation"><div className="sentinel-explanation-bars">{explainableFactors.map(([label, width, status]) => <div key={label}><span>{label}</span><div><i style={{ width: `${width}%` }} /></div><b>{status}</b></div>)}</div><p>{currentRisk == null ? 'A validated model explanation is unavailable because no trained historical-event model is deployed.' : `Observed telemetry currently supports a ${currentLevel.toLowerCase()} risk assessment. The values above are source inputs, not fabricated model contribution scores.`}</p></div><div className="sentinel-ai-conclusion"><span>Decision support status</span><strong>{currentRisk == null ? 'MODEL UNAVAILABLE' : `Observed risk score: ${currentRisk} / 100`}</strong></div></article>
    </section>

    <section className="sentinel-two-col"><article className="sentinel-panel"><SectionHeader eyebrow="LIVE OPERATIONAL VIEW" title="Observed risk trend" action="GIS risk map" onAction={() => onNavigate('map')} />{trendPoints.length ? <><div className="sentinel-trend-status"><b>{riskTrend.direction}</b><span>{trendPoints.length} live readings · last 24 hours</span></div><svg className="sentinel-trend-chart" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="0" y1="25" x2="100" y2="25"/><line x1="0" y1="50" x2="100" y2="50"/><line x1="0" y1="75" x2="100" y2="75"/><polyline points={trendPolyline} /></svg></> : <div className="sentinel-data-unavailable sentinel-trend-empty"><Gauge size={20} /><div><strong>AI trend analysis is waiting for live history</strong><span>Current risk: {currentRisk == null ? 'unavailable' : `${currentRisk}/100`}. A direction and chart will appear after the first saved telemetry readings.</span></div></div>}</article><article className="sentinel-panel"><SectionHeader eyebrow="ROAD STATUS & CONNECTIVITY" title="Safe transit corridors" action="View all roads" onAction={() => onNavigate('roads')} /><div className="sentinel-road-list">{roadStatus.slice(0, 3).map((road) => { const status = String(road.status || 'OPEN').toUpperCase(); return <div className="sentinel-road-row" key={road.road_id || road.road_name}><div><strong>{road.road_name}</strong><span>{road.reason || 'No specific hazards reported'}</span></div><RiskBadge level={status === 'OPEN' ? 'LOW' : status === 'BLOCKED' ? 'CRITICAL' : 'MODERATE'} /></div>; })}{!roadStatus.length && <div className="sentinel-empty-inline">No road-status data returned.</div>}</div><div className="sentinel-alternate"><ArrowUpRight size={17} /><div><span>Recommended route guidance</span><strong>Open Road Status for current advisories</strong></div><button onClick={() => onNavigate('roads')}>View routes</button></div></article></section>

    <section className="sentinel-two-col"><article className="sentinel-panel"><SectionHeader eyebrow="LIVE ALERTS & DISPATCHES" title="Latest warnings" action="View all alerts" onAction={() => onNavigate('alerts')} /><div className="sentinel-alert-list">{alerts.slice(0, 3).map((alert) => <div className="sentinel-alert-row" key={alert.id}><RiskBadge level={alert.severity || alert.risk_level} /><div><strong>{regions.find((region) => region.region_id === alert.region_id)?.name || 'Unknown region'}</strong><span>{alert.reason}</span></div><b>{alert.risk_score ? Math.round(alert.risk_score * 100) : '--'}</b><ChevronRight size={17} /></div>)}{!alerts.length && <div className="sentinel-empty-inline">No active warnings returned by the alert service.</div>}</div></article><article className="sentinel-panel sentinel-satellite"><SectionHeader eyebrow="SATELLITE TERRAIN MONITORING" title="Layer status" action="Open GIS map" onAction={() => onNavigate('map')} /><div className="sentinel-data-unavailable"><Satellite size={20} /><div><strong>Satellite layer not connected</strong><span>Terrain imagery and change metrics will appear here when a configured imagery provider is available.</span></div></div><div className="sentinel-satellite-stats"><span><b>GIS</b>Available map layer</span><span><b>API</b>Provider status</span><span><b>--</b>Change metrics</span></div></article></section>

    <section className="sentinel-bottom-grid"><button className="sentinel-action-tile" onClick={() => onNavigate('report')}><Smartphone size={22} /><span><b>Report a landslide or hazard</b><small>Geo-tagged citizen reporting with offline queue</small></span><ChevronRight size={18} /></button><button className="sentinel-action-tile" onClick={() => onNavigate('safety')}><Users size={22} /><span><b>Safety & emergency</b><small>112 · 108 · nearest evacuation center 2.4 km</small></span><ChevronRight size={18} /></button><div className="sentinel-language"><span>Alert language</span><select value={language} onChange={(event) => setLanguage(event.target.value)}>{['English', 'Hindi', 'Assamese', 'Khasi', 'Nagamese', 'Mizo'].map((item) => <option key={item}>{item}</option>)}</select></div><div className="sentinel-offline"><WifiOff size={18} /><div><b>3 pending reports</b><span>Stored locally · sync when network returns</span></div></div></section>

    {showAnalysis && <div className="sentinel-modal-backdrop" role="presentation" onClick={() => setShowAnalysis(false)}><div className="sentinel-modal" role="dialog" aria-modal="true" aria-label="AI analysis" onClick={(event) => event.stopPropagation()}><button className="sentinel-modal-close" onClick={() => setShowAnalysis(false)} aria-label="Close"><X size={18} /></button><div className="sentinel-eyebrow">CONNECTED AI ANALYSIS</div><h2>{analysis.location} risk factors</h2><p>The current score is derived from environmental observations and the alert decision returned by the Landslide Sentinel backend.</p><div className="sentinel-modal-flow"><span>Rainfall</span><b>→</b><span>Soil saturation</span><b>→</b><span>Slope + history</span><b>→</b><strong>Risk {currentRisk}</strong></div><section className="sentinel-modal-trend"><div className="sentinel-modal-trend-head"><div><div className="sentinel-eyebrow">AI TREND ANALYSIS</div><strong>Observed risk movement</strong></div><span className={trendAnalysis?.change > 0 ? 'is-rising' : trendAnalysis?.change < 0 ? 'is-falling' : ''}>{trendAnalysis?.direction || 'NO DATA'}</span></div>{trendAnalysis ? <><div className="sentinel-trend-stats"><span><b>{trendAnalysis.change > 0 ? '+' : ''}{trendAnalysis.change}</b><small>score change</small></span><span><b>{trendAnalysis.peak}</b><small>peak score</small></span><span><b>{trendPoints.length}</b><small>readings</small></span></div><svg className="sentinel-modal-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="AI observed risk trend over the last 24 hours"><line x1="0" y1="25" x2="100" y2="25" /><line x1="0" y1="50" x2="100" y2="50" /><line x1="0" y1="75" x2="100" y2="75" /><polyline points={trendPolyline} /></svg><small className="sentinel-trend-caption">From {trendAnalysis.first} to {trendAnalysis.latest} risk score over the last 24 hours.</small></> : <div className="sentinel-trend-empty">No observed history is available yet. Trend analysis will appear after live readings are saved.</div>}</section><button className="sentinel-primary-button" onClick={() => { setShowAnalysis(false); onNavigate('map'); }}>Open GIS context <Map size={16} /></button></div></div>}
  </div>;
}
