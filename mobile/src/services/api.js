import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getDefaultApiBaseUrl = () => {
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return 'http://10.229.128.155:8000/api/v1';
  }

  return 'http://localhost:8000/api/v1';
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || getDefaultApiBaseUrl();

export let offlineMode = false;

export function setOfflineMode(value) {
  offlineMode = value;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

const originalRequest = api.request.bind(api);
api.request = async (config) => {
  if (offlineMode) {
    const err = new Error('Offline mode - API calls disabled');
    err.isOffline = true;
    err.code = 'ECONNABORTED';
    return Promise.reject(err);
  }
  return originalRequest(config);
};

api.interceptors.response.use(
  (response) => {
    // If successful, log that we are online
    AsyncStorage.setItem('is_online', 'true');
    return response;
  },
  async (error) => {
    // Network errors or timeout
    if (!error.response || error.code === 'ECONNABORTED') {
      await AsyncStorage.setItem('is_online', 'false');
      error.isOffline = true;
    }
    return Promise.reject(error);
  }
);

export default api;
