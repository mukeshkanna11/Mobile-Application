import API from '@/services/api';
import {
  getItem,
  removeItem,
  setItem,
  setObject,
  StorageKeys,
} from '@/services/storage';

export interface AuthUser {
  id?: string;
  name?: string;
  email: string;
  role?: string;
  [key: string]: unknown;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

/**
 * POST /auth/login. Persists JWT + user in Secure Store on success.
 * Reuses the existing backend — no new endpoints.
 */
export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const { data } = await API.post<LoginResponse>('/auth/login', {
    email,
    password,
  });

  await setItem(StorageKeys.token, data.token);
  await setObject(StorageKeys.user, data.user);

  return data;
}

export async function logout(): Promise<void> {
  await removeItem(StorageKeys.token);
  await removeItem(StorageKeys.user);
}

export async function getToken(): Promise<string | null> {
  return getItem(StorageKeys.token);
}

/** Remember Me: store / restore / clear the admin password. */
export async function saveRememberedPassword(password: string): Promise<void> {
  await setItem(StorageKeys.rememberPassword, password);
}

export async function getRememberedPassword(): Promise<string | null> {
  return getItem(StorageKeys.rememberPassword);
}

export async function clearRememberedPassword(): Promise<void> {
  await removeItem(StorageKeys.rememberPassword);
}
