import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const getRegions = async () => {
  const response = await api.get('/regions');
  return response.data;
};

export const getRiskStatus = async (regionId) => {
  // Use citizen endpoint for risk status
  const response = await api.get(`/citizen/risk?region_id=${regionId}`);
  return response.data;
};

export const getAlerts = async () => {
  // Use citizen endpoint for alerts
  const response = await api.get('/citizen/alerts');
  return response.data;
};

export const getCitizenAlerts = async (regionId) => {
  // Get alerts for a specific region
  const response = await api.get(`/citizen/alerts?region_id=${regionId}`);
  return response.data;
};

export const getReports = async () => {
  const response = await api.get('/reports');
  return response.data;
};

export const submitCitizenReport = async (reportData) => {
  const response = await api.post('/citizen/reports', reportData);
  return response.data;
};
