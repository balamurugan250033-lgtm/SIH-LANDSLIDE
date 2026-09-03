import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getDefaultApiBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://192.168.1.5:8000/api/v1';
  }

  if (Platform.OS === 'ios') {
    return 'http://192.168.1.5:8000/api/v1';
  }

  return 'http://172.15.7.7:8000/api/v1';
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || getDefaultApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

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
