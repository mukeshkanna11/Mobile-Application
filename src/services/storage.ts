import * as SecureStore from 'expo-secure-store';

/**
 * Thin, typed wrapper over Expo Secure Store. All auth secrets (JWT, cached
 * user, remembered password) live here — never in AsyncStorage.
 */

export const StorageKeys = {
  token: 'auth.token',
  user: 'auth.user',
  rememberPassword: 'auth.rememberPassword',
} as const;

export async function setItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function getItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function removeItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

export async function setObject<T>(key: string, value: T): Promise<void> {
  await SecureStore.setItemAsync(key, JSON.stringify(value));
}

export async function getObject<T>(key: string): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
