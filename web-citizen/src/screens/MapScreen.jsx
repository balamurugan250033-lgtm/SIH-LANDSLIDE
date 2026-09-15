import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, WMSTileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default Leaflet marker assets
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetina: undefined,
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const RISK_COLORS = {
  LOW: '#16A34A',
  MODERATE: '#D97706',
  HIGH: '#EA580C',
  CRITICAL: '#DC2626',
  SEVERE: '#7C2D12',
};

function RegionMarkers({ regions, selectedRegion, onSelectRegion }) {
  const map = useMap();
  const markersRef = useRef([]);

  useEffect(() => {
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (!regions || regions.length === 0) return;

    const group = L.featureGroup();
    regions.forEach(region => {
      const color = RISK_COLORS[region.risk_level] || '#64748B';
      const isSelected = region.region_id === selectedRegion;
      const marker = L.circleMarker([region.latitude, region.longitude], {
        color: isSelected ? '#1E293B' : '#FFFFFF',
        weight: isSelected ? 3 : 2,
        fillColor: color,
        fillOpacity: isSelected ? 0.95 : 0.85,
        radius: isSelected ? 14 : 10,
      });

      marker.bindPopup(
        `<div style="font-family: system-ui, -apple-system, sans-serif; font-size: 13px; line-height: 1.4;">
          <strong style="font-size: 14px; color: #0F172A;">${region.name}</strong><br/>
          <span style="display:inline-block; margin-top: 4px; padding: 2px 6px; border-radius: 4px; background: ${color}22; color: ${color}; font-weight: 700; font-size: 11px;">
            ${region.risk_level} RISK
          </span><br/>
          <span style="color: #475569; font-size: 12px; margin-top: 4px; display: block;">
            Rain: <b>${region.rainfall_mm ?? '—'} mm</b> | Soil: <b>${region.soil_saturation ?? '—'}%</b><br/>
            Slope: <b>${region.slope_angle ?? '—'}°</b> | Vibration: <b>${region.vibration ? 'Detected' : 'Stable'}</b>
          </span>
        </div>`
      );

      marker.on('click', () => {
        if (onSelectRegion) onSelectRegion(region.region_id);
      });
      group.addLayer(marker);
      markersRef.current.push(marker);
    });

    map.addLayer(group);

    try {
      const bounds = group.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.2), { padding: [20, 20], maxZoom: 10 });
      }
    } catch {
      // Ignore bounds error if points are identical
    }

    return () => {
      markersRef.current.forEach(m => map.removeLayer(m));
      markersRef.current = [];
    };
  }, [regions, selectedRegion, onSelectRegion, map]);

  return null;
}

export default function MapScreen({ regions, selectedRegion, onSelectRegion }) {
  const [tileError, setTileError] = useState(false);
  if (!regions || regions.length === 0) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h2>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
            Region GIS Map
          </h2>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No monitored regions to display on map.</div>
      </div>
    );
  }

  const centerLat = regions[0]?.latitude || 26.1445;
  const centerLng = regions[0]?.longitude || 91.7362;

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
          GIS Surveillance Map
        </h2>
        <span className="panel-badge">{regions.length} active zones</span>
      </div>
      <div className="gis-map-frame">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            eventHandlers={{ tileerror: () => setTileError(true) }}
          />
          <WMSTileLayer
            url="https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms"
            layers="landslide_susceptibility"
            format="image/png"
            transparent={true}
            version="1.1.1"
            opacity={0.65}
          />
          <RegionMarkers regions={regions} selectedRegion={selectedRegion} onSelectRegion={onSelectRegion} />
        </MapContainer>
      </div>
      {tileError && <div className="gis-map-warning" role="status">Basemap tiles are unavailable. Region markers and risk data remain available from the monitoring service.</div>}
      <div className="gis-legend" aria-label="Risk map legend">
        <strong>Risk legend</strong>
        {Object.entries(RISK_COLORS).map(([level, color]) => <span key={level}><i style={{ background: color }} />{level}</span>)}
        <small>Markers reflect the latest region risk returned by the monitoring service.</small>
      </div>
    </div>
  );
}
