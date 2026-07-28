import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const StorageKeys = {
  token: "auth.token",
  user: "auth.user",
  rememberPassword: "auth.rememberPassword",
} as const;

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }

  return await SecureStore.getItemAsync(key);
}

export async function removeItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export async function setObject<T>(key: string, value: T): Promise<void> {
  await setItem(key, JSON.stringify(value));
}

export async function getObject<T>(key: string): Promise<T | null> {
  const raw = await getItem(key);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}