import React, { useEffect, useState } from 'react';
import { getRegions, getRiskStatus, getCitizenAlerts } from '../services/api';
import { StatCard, AlertBadge, RiskLevelBadge } from '../components/UI';
import { AlertCircle, MapPin, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const CitizenDashboard = () => {
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [riskStatus, setRiskStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportForm, setReportForm] = useState({
    hazardType: 'Landslide',
    description: '',
    latitude: '',
    longitude: ''
  });
  const [submitMessage, setSubmitMessage] = useState(null);

  useEffect(() => {
    fetchRegions();
  }, []);

  useEffect(() => {
    if (selectedRegion) {
      fetchRiskData(selectedRegion);
    }
  }, [selectedRegion]);

  const fetchRegions = async () => {
    try {
      const data = await getRegions();
      setRegions(data);
      if (data.length > 0) {
        setSelectedRegion(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch regions', err);
    }
  };

  const fetchRiskData = async (regionId) => {
    setLoading(true);
    try {
      // Fetch risk status for selected region
      const riskRes = await getRiskStatus(regionId);
      setRiskStatus(riskRes);

      // Fetch alerts for the region
      const alertsRes = await getCitizenAlerts(regionId);
      setAlerts(alertsRes);
    } catch (err) {
      console.error('Failed to fetch risk data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    
    if (!reportForm.description.trim()) {
      setSubmitMessage({ type: 'error', text: 'Please describe the hazard' });
      return;
    }

    try {
      // Submit report via API
      const response = await fetch('http://localhost:8000/api/v1/citizen/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region_id: selectedRegion,
          hazard_type: reportForm.hazardType,
          description: reportForm.description,
          latitude: reportForm.latitude ? parseFloat(reportForm.latitude) : null,
          longitude: reportForm.longitude ? parseFloat(reportForm.longitude) : null
        })
      });

      if (response.ok) {
        const newReport = await response.json();
        setReports([newReport, ...reports]);
        setReportForm({
          hazardType: 'Landslide',
          description: '',
          latitude: '',
          longitude: ''
        });
        setSubmitMessage({ type: 'success', text: 'Report submitted successfully!' });
        setTimeout(() => setSubmitMessage(null), 3000);
      } else {
        setSubmitMessage({ type: 'error', text: 'Failed to submit report' });
      }
    } catch (err) {
      console.error('Failed to submit report', err);
      setSubmitMessage({ type: 'error', text: 'Error submitting report' });
    }
  };

  const getRegionName = (regionId) => {
    const region = regions.find(r => r.id === regionId);
    return region ? region.name : `Region #${regionId}`;
  };

  const riskColors = {
    CRITICAL: '#EF4444',
    HIGH: '#F97316',
    MODERATE: '#EAB308',
    LOW: '#22C55E'
  };

  return (
    <div className="animate-fade-in">
      {/* Region Selection */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 className="heading-lg" style={{ marginBottom: '1rem' }}>Select Your Region</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {regions.map(region => (
            <button
              key={region.id}
              onClick={() => setSelectedRegion(region.id)}
              style={{
                padding: '1rem',
                border: '2px solid ' + (selectedRegion === region.id ? '#2563EB' : '#E2E8F0'),
                backgroundColor: selectedRegion === region.id ? '#F0F9FF' : '#FFFFFF',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 600, color: '#0F172A' }}>{region.name}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '0.25rem' }}>
                Lat: {region.latitude.toFixed(4)}, Lon: {region.longitude.toFixed(4)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Risk Status Overview */}
      {selectedRegion && riskStatus && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 className="heading-md" style={{ marginBottom: '1.5rem' }}>Current Risk Status</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              borderLeft: '4px solid ' + (riskStatus.current_alert ? riskColors[riskStatus.current_alert.risk_level] : '#22C55E')
            }}>
              <div style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '0.5rem' }}>Current Risk Level</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: riskColors[riskStatus.current_alert?.risk_level || 'LOW'] }}>
                {riskStatus.current_alert ? riskStatus.current_alert.risk_level : 'LOW'}
              </div>
            </div>
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              borderLeft: '4px solid #2563EB'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '0.5rem' }}>Data Status</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#0F172A' }}>
                {riskStatus.data_status}
              </div>
            </div>
            {riskStatus.latest_observation && (
              <div style={{
                padding: '1.5rem',
                backgroundColor: '#F8FAFC',
                borderRadius: '8px',
                borderLeft: '4px solid #8B5CF6'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '0.5rem' }}>Latest Rainfall</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#0F172A' }}>
                  {riskStatus.latest_observation.rainfall_mm || 'N/A'} mm
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report Submission Form */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 className="heading-md" style={{ marginBottom: '1.5rem' }}>Report a Hazard</h3>
        <form onSubmit={handleReportSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Hazard Type
            </label>
            <select
              value={reportForm.hazardType}
              onChange={(e) => setReportForm({ ...reportForm, hazardType: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            >
              <option>Landslide</option>
              <option>Rockfall</option>
              <option>Mudslide</option>
              <option>Soil Cracks</option>
              <option>Blocked Road</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Description
            </label>
            <textarea
              value={reportForm.description}
              onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
              placeholder="Describe the hazard in detail..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                minHeight: '120px',
                fontSize: '1rem',
                fontFamily: 'inherit'
              }}
              maxLength={500}
            />
            <div style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '0.25rem' }}>
              {reportForm.description.length}/500 characters
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Latitude (optional)
              </label>
              <input
                type="number"
                step="0.0001"
                value={reportForm.latitude}
                onChange={(e) => setReportForm({ ...reportForm, latitude: e.target.value })}
                placeholder="e.g., 10.0889"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Longitude (optional)
              </label>
              <input
                type="number"
                step="0.0001"
                value={reportForm.longitude}
                onChange={(e) => setReportForm({ ...reportForm, longitude: e.target.value })}
                placeholder="e.g., 77.0595"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          {submitMessage && (
            <div style={{
              padding: '1rem',
              marginBottom: '1rem',
              borderRadius: '6px',
              backgroundColor: submitMessage.type === 'success' ? '#DCFCE7' : '#FEE2E2',
              color: submitMessage.type === 'success' ? '#166534' : '#991B1B',
              border: '1px solid ' + (submitMessage.type === 'success' ? '#86EFAC' : '#FECACA')
            }}>
              {submitMessage.text}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#1D4ED8'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#2563EB'}
          >
            Submit Report
          </button>
        </form>
      </div>

      {/* Recent Alerts for Selected Region */}
      {selectedRegion && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 className="heading-md" style={{ marginBottom: '1.5rem' }}>
            Recent Alerts - {getRegionName(selectedRegion)}
          </h3>
          
          {alerts.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Risk Level</th>
                    <th>Score</th>
                    <th>Reason</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert.id}>
                      <td><AlertBadge level={alert.risk_level} /></td>
                      <td>{(alert.risk_score * 100).toFixed(1)}%</td>
                      <td>{alert.reason}</td>
                      <td>{new Date(alert.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#64748B'
            }}>
              <AlertCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>No alerts in the last 24 hours for this region</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CitizenDashboard;
