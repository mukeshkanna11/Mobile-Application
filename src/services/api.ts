import axios from 'axios';

import { API_URL } from '@/constants/config';
import { getItem, StorageKeys } from '@/services/storage';

/**
 * Axios instance mirroring the web dashboard client, adapted for React Native:
 * the JWT is pulled from Expo Secure Store (async) on every request.
 */
const API = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

API.interceptors.request.use(async (config) => {
  const token = await getItem(StorageKeys.token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
