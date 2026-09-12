const RENDER_API_URL = 'https://sih-landslide-yuc9.onrender.com/api/v1';
const API_BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api/v1' : RENDER_API_URL)
).replace(/\/$/, '');

export { API_BASE };

let mockRegions = [];
let mockAlerts = [];
let mockNotifications = [];
let mockReports = [];

export async function fetchStats(token) {
  try {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Stats API returned ' + res.status);
    return await res.json();
  } catch (err) {
    return { total_regions: 0, total_alerts: 0, critical_alerts: 0, total_notifications: 0, total_reports: 0, active_users: null, source: 'unavailable' };
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

export async function fetchReports(token) {
  try {
    const res = await fetch(`${API_BASE}/admin/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Reports API returned ' + res.status);
    const data = await res.json();
    if (Array.isArray(data)) {
      mockReports = data;
      return data;
    }
    return [];
  } catch (err) {
    return [];
  }
}

export async function updateReportStatus(reportId, status, token) {
  try {
    const res = await fetch(`${API_BASE}/admin/reports/${reportId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update report status');
    return await res.json();
  } catch (err) {
    throw err;
  }
}

export async function deleteReport(reportId, token) {
  try {
    const res = await fetch(`${API_BASE}/admin/reports/${reportId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete report');
    return await res.json();
  } catch (err) {
    throw err;
  }
}

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
