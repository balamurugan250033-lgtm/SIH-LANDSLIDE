const API_BASE = 'http://192.168.1.5:8000/api/v1';

export async function fetchStats(token) {
  const res = await fetch(`${API_BASE}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchRegions(token) {
  const res = await fetch(`${API_BASE}/admin/regions`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to fetch regions');
  return res.json();
}

export async function fetchAlerts(token) {
  const res = await fetch(`${API_BASE}/admin/alerts`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function fetchNotifications(token) {
  const res = await fetch(`${API_BASE}/admin/notifications`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export async function createAlert(data, token) {
  const res = await fetch(`${API_BASE}/admin/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create alert');
  }
  return res.json();
}

export async function sendNotification(data, token) {
  const res = await fetch(`${API_BASE}/admin/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to send notification');
  }
  return res.json();
}

export async function deleteRegion(regionId, token) {
  const res = await fetch(`${API_BASE}/admin/regions/${regionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete region');
  return res.json();
}
