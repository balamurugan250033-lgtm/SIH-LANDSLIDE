import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

export const getHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch {
    return { status: 'UNAVAILABLE', reason: 'Health service unavailable' };
  }
};

export const getRegions = async () => {
  try {
    const response = await api.get('/regions');
    return Array.isArray(response.data) ? response.data : [];
  } catch {
    return [];
  }
};

export const getRiskStatus = async (regionId) => {
  try {
    const response = await api.get(`/citizen/risk?region_id=${regionId}`);
    return response.data;
  } catch {
    return { region_id: regionId, data_status: 'UNAVAILABLE', current_alert: null };
  }
};

export const getAlerts = async () => {
  try {
    const response = await api.get('/citizen/alerts');
    return Array.isArray(response.data) ? response.data : [];
  } catch {
    return [];
  }
};

export const getCitizenAlerts = async (regionId) => {
  try {
    const response = await api.get(`/citizen/alerts?region_id=${regionId}`);
    return response.data;
  } catch {
    return [];
  }
};

export const getReports = async () => {
  try {
    const response = await api.get('/reports');
    return Array.isArray(response.data) ? response.data : [];
  } catch {
    return [];
  }
};

export const submitCitizenReport = async (reportData) => {
  try {
    const response = await api.post('/citizen/reports', reportData);
    return response.data;
  } catch (error) {
    throw error;
  }
};
