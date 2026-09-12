import { queuePendingReport } from './services/offlineQueue';

const RENDER_API_URL = 'https://sih-landslide-yuc9.onrender.com/api/v1';
const API_BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api/v1' : RENDER_API_URL)
).replace(/\/$/, '');

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health API returned ' + res.status);
    return await res.json();
  } catch (err) {
    console.warn('Data-source health unavailable:', err.message);
    return [];
  }
}

export async function fetchRegions() {
  try {
    const res = await fetch(`${API_BASE}/citizen/regions`);
    if (!res.ok) throw new Error('API returned ' + res.status);
    const data = await res.json();
    if (Array.isArray(data)) {
      data.source = 'api';
      return data;
    }
    return [];
  } catch (err) {
    console.warn('Region data unavailable:', err.message);
    return [];
  }
}

export async function fetchAlerts() {
  try {
    const res = await fetch(`${API_BASE}/citizen/alerts`);
    if (!res.ok) throw new Error('API returned ' + res.status);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Alert data unavailable:', err.message);
    return [];
  }
}

export async function fetchNotifications() {
  try {
    const res = await fetch(`${API_BASE}/citizen/notifications`);
    if (!res.ok) throw new Error('API returned ' + res.status);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Notification data unavailable:', err.message);
    return [];
  }
}

export async function fetchRoadStatus() {
  try {
    const res = await fetch(`${API_BASE}/citizen/road-statuses`);
    if (!res.ok) throw new Error('API returned ' + res.status);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Road data unavailable:', err.message);
    return [];
  }
}

export async function fetchCitizenRiskTrend(regionId) {
  if (!regionId) return null;
  const res = await fetch(`${API_BASE}/citizen/regions/${regionId}/risk-trend?hours=24`);
  if (!res.ok) throw new Error('Risk trend is temporarily unavailable');
  return res.json();
}

export async function fetchCitizenReports(regionId = null) {
  try {
    const url = regionId ? `${API_BASE}/citizen/reports?region_id=${regionId}` : `${API_BASE}/citizen/reports`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Reports unavailable');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Citizen reports unavailable:', err.message);
    return [];
  }
}

export async function submitReport(data) {
  const payload = {
    region_id: parseInt(data.region_id, 10),
    description: data.description,
    hazard_types: Array.isArray(data.hazard_types) ? data.hazard_types : [data.hazard_types || 'General Hazard'],
    photo_url: data.photo_url || null,
    latitude: data.latitude ? parseFloat(data.latitude) : null,
    longitude: data.longitude ? parseFloat(data.longitude) : null,
  };

  try {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/citizen/reports`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || `Server error (${res.status}) submitting report`);
    }
    const json = await res.json();
    return { success: true, message: `Report successfully filed with ID: REP-${json.id || Date.now()}`, ...json };
  } catch (err) {
    console.warn('Network submit failed, saving to local offline report queue:', err.message);
    const queued = queuePendingReport(payload);
    return {
      success: true,
      message: `Report securely saved to Offline Sync Queue (ID: ${queued.report.id}). It will automatically synchronize once backend connectivity is restored.`,
      report_id: queued.report.id,
      queued: true,
    };
  }
}
