import axios from 'axios';
import { router } from 'expo-router';

import { API_URL } from '@/constants/config';
import { getItem, removeItem, StorageKeys } from '@/services/storage';

/**
 * Axios instance mirroring the web dashboard client, adapted for React Native:
 * the JWT is pulled from Expo Secure Store (async) on every request.
 */
const API = axios.create({
  baseURL: API_URL,
  // 30s: production requests can hit cold starts and slow mobile networks;
  // 15s aborted client-side before the server had answered.
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

API.interceptors.request.use(async (config) => {

  console.log(
    "REQUEST URL:",
    `${config.baseURL ?? ''}${config.url ?? ''}`
  );

  const token = await getItem(StorageKeys.token);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/**
 * 401 -> session expired / invalid: clear the stored auth and return to the
 * login screen. The login request itself is excluded so a wrong password still
 * surfaces its own error on the login screen.
 */
let redirectingToLogin = false;

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isLoginRequest = String(error?.config?.url ?? '').includes('/auth/login');

    if (error?.response?.status === 401 && !isLoginRequest && !redirectingToLogin) {
      redirectingToLogin = true;
      try {
        await removeItem(StorageKeys.token);
        await removeItem(StorageKeys.user);
        router.replace('/');
      } catch {
        /* navigation not ready — stored auth is already cleared */
      } finally {
        setTimeout(() => {
          redirectingToLogin = false;
        }, 1000);
      }
    }

    return Promise.reject(error);
  }
);

export default API;
