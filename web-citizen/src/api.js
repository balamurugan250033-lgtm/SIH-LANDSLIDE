const API_BASE = 'http://192.168.1.5:8000/api/v1';

export async function fetchRegions() {
  const res = await fetch(`${API_BASE}/citizen/regions`);
  if (!res.ok) throw new Error('Failed to fetch regions');
  return res.json();
}

export async function fetchAlerts() {
  const res = await fetch(`${API_BASE}/citizen/alerts`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function fetchNotifications() {
  const res = await fetch(`${API_BASE}/citizen/notifications`);
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export async function fetchRoadStatus() {
  const res = await fetch(`${API_BASE}/citizen/road-status`);
  if (!res.ok) throw new Error('Failed to fetch road status');
  return res.json();
}

export async function submitReport(data) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/citizen/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit report');
  return res.json();
}
