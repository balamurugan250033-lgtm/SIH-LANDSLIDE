const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

export { API_BASE };

// No in-memory operational data is used. The admin console reflects the API only.
let mockRegions = [];
let mockAlerts = [];
let mockNotifications = [];

function buildStats() {
  const critical = mockAlerts.filter(a => ['CRITICAL', 'SEVERE'].includes(a.severity || a.risk_level)).length;
  return {
    total_regions: mockRegions.length,
    total_alerts: mockAlerts.length,
    critical_alerts: critical,
    total_notifications: mockNotifications.length,
    active_users: null,
  };
}

export async function fetchStats(token) {
  try {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Stats API returned ' + res.status);
    return await res.json();
  } catch (err) {
    return { total_regions: 0, total_alerts: 0, critical_alerts: 0, total_notifications: 0, active_users: null, source: 'unavailable' };
  }
}

export async function fetchRegions(token) {
  try {
    const res = await fetch(`${API_BASE}/admin/regions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Regions API returned ' + res.status);
    const data = await res.json();
    if (Array.isArray(data)) {
      mockRegions = data;
      return data;
    }
    return [];
  } catch (err) {
    return [];
  }
}

export async function fetchAlerts(token) {
  try {
    const res = await fetch(`${API_BASE}/admin/alerts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Alerts API returned ' + res.status);
    const data = await res.json();
    if (Array.isArray(data)) {
      mockAlerts = data;
      return data;
    }
    return [];
  } catch (err) {
    return [];
  }
}

export async function fetchNotifications(token) {
  try {
    const res = await fetch(`${API_BASE}/admin/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Notifications API returned ' + res.status);
    const data = await res.json();
    if (Array.isArray(data)) {
      mockNotifications = data;
      return data;
    }
    return [];
  } catch (err) {
    return [];
  }
}

// Pull the latest observed weather and soil telemetry for every configured region.
// Open-Meteo is the default live source; the backend falls back only to configured providers.
export async function ingestLiveTelemetry(token) {
  const res = await fetch(`${API_BASE}/environment/ingest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Unable to retrieve live environmental telemetry');
  }
  return res.json();
}

export async function fetchRiskTrend(regionId, token) {
  const res = await fetch(`${API_BASE}/admin/regions/${regionId}/risk-trend?hours=48`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Unable to load observed risk trend');
  return res.json();
}

export async function createAlert(data, token) {
  try {
    const res = await fetch(`${API_BASE}/admin/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create alert on server');
    }
    const json = await res.json();
    mockAlerts.unshift(json);
    return json;
  } catch (err) {
    throw err;
  }
}

export async function sendNotification(data, token) {
  try {
    const res = await fetch(`${API_BASE}/admin/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to send notification');
    }
    const json = await res.json();
    mockNotifications.unshift(json);
    return json;
  } catch (err) {
    throw err;
  }
}

export async function saveRegion(data, editingId, token) {
  try {
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${API_BASE}/admin/regions/${editingId}` : `${API_BASE}/admin/regions`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save region on server');
    return await res.json();
  } catch (err) {
    throw err;
  }
}

export async function deleteRegion(regionId, token) {
  try {
    const res = await fetch(`${API_BASE}/admin/regions/${regionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete region');
    mockRegions = mockRegions.filter(r => r.region_id !== regionId);
    return await res.json();
  } catch (err) {
    throw err;
  }
}
