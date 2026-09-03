import { useState, useEffect, useRef } from 'react';

const RISK_COLORS = {
  LOW: '#16A34A', MODERATE: '#D97706', HIGH: '#EA580C', CRITICAL: '#DC2626', SEVERE: '#7C2D12',
};

export default function MapScreen({ regions, selectedRegion, onSelectRegion }) {
  const [mapError, setMapError] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.google?.maps) {
      setMapError(true);
      return;
    }
    setMapLoaded(true);
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: regions[0]?.latitude || 20.5937, lng: regions[0]?.longitude || 78.9629 },
      zoom: 7,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#F8FAFC' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#F8FAFC' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#64748B' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#E0F2FE' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
      ],
    });
    mapInstanceRef.current = map;

    const bounds = new window.google.maps.LatLngBounds();
    regions.forEach(region => {
      const marker = new window.google.maps.Marker({
        position: { lat: region.latitude, lng: region.longitude },
        map,
        title: region.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: RISK_COLORS[region.risk_level] || '#64748B',
          fillOpacity: 0.9,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });
      marker.addListener('click', () => { onSelectRegion(region.region_id); });
      bounds.extend(marker.getPosition());
      markersRef.current.push(marker);
    });

    if (regions.length > 0) map.fitBounds(bounds, 60);

    const interval = setInterval(() => {
      if (mapInstanceRef.current) {
        regions.forEach((region, i) => {
          if (markersRef.current[i]) {
            markersRef.current[i].setIcon({
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: region.region_id === selectedRegion ? 14 : 10,
              fillColor: RISK_COLORS[region.risk_level] || '#64748B',
              fillOpacity: 0.95,
              strokeColor: region.region_id === selectedRegion ? '#1E293B' : '#FFFFFF',
              strokeWeight: region.region_id === selectedRegion ? 3 : 2,
            });
          }
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [regions, selectedRegion]);

  const focusRegion = (region) => {
    onSelectRegion(region.region_id);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: region.latitude, lng: region.longitude });
      mapInstanceRef.current.setZoom(12);
    }
  };

  if (mapError) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h2>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
            Region Map
          </h2>
        </div>
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Google Maps API key not configured. Showing region overview instead.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {regions.map(region => (
              <div key={region.region_id} onClick={() => focusRegion(region)} style={{
                padding: '1rem', border: `2px solid ${selectedRegion === region.region_id ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: selectedRegion === region.region_id ? 'var(--primary-light)' : 'white',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{region.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{region.latitude.toFixed(4)}, {region.longitude.toFixed(4)}</div>
                </div>
                <span className="region-risk-badge" style={{ background: getRiskBg(region.risk_level), color: getRiskText(region.risk_level) }}>
                  {region.risk_level}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!mapLoaded) {
    return (
      <div className="panel">
        <div className="panel-header"><h2>Region Map</h2></div>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading map...</div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
          Region Map
        </h2>
        <span className="panel-badge">{regions.length} regions</span>
      </div>
      <div ref={mapRef} style={{ height: '500px', width: '100%' }} />
    </div>
  );
}

function getRiskBg(level) {
  const bgs = { LOW: '#DCFCE7', MODERATE: '#FEF3C7', HIGH: '#FFEDD5', CRITICAL: '#FEE2E2', SEVERE: '#FECACA' };
  return bgs[level] || '#F1F5F9';
}
function getRiskText(level) {
  const texts = { LOW: '#166534', MODERATE: '#92400E', HIGH: '#9A3412', CRITICAL: '#991B1B', SEVERE: '#7C2D12' };
  return texts[level] || '#475569';
}
