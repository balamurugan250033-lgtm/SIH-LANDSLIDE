import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isOffline = !navigator.onLine || !error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error';
    if (isOffline) {
      error.isOffline = true;
    }
    return Promise.reject(error);
  }
);

export const getRegions = async () => {
  const response = await api.get('/regions');
  return response.data;
};

export const getRiskStatus = async (regionId) => {
  const response = await api.get(`/citizen/risk?region_id=${regionId}`);
  return response.data;
};

export const getCitizenAlerts = async (regionId) => {
  const response = await api.get(`/citizen/alerts?region_id=${regionId}`);
  return response.data;
};

export const submitCitizenReport = async (reportData) => {
  const response = await api.post('/citizen/reports', reportData);
  return response.data;
};

export const getRoadStatuses = async (regionId) => {
  const response = await api.get(`/citizen/road-statuses?region_id=${regionId}`);
  return response.data;
};

export const getNotifications = async (regionId) => {
  const response = await api.get(`/citizen/notifications?region_id=${regionId}`);
  return response.data;
};
