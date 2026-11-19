import API from './api';
import { getObject, setObject, StorageKeys } from './storage';

/* =========================================================
   MY PROFILE + NOTIFICATIONS — same endpoints as the website
   (Frontend/src/services/profileService.js). Own record only;
   the backend scopes everything to the signed-in user/workspace.
========================================================= */

export interface MyProfile {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string | null;
  role?: string;
  department?: string;
  designation?: string;
  createdAt?: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  name?: string;
  meta?: string;
  link?: string;
  createdAt: string;
  read: boolean;
}

export interface NotificationFeed {
  items: AppNotification[];
  unread: number;
  /** Admin Settings → Notifications: push alerts switched off */
  disabled?: boolean;
}

export async function getMyProfile(): Promise<MyProfile> {
  const { data } = await API.get('/user/me');
  return data?.data;
}

/** PATCH /user/me — the API accepts name and phone (and avatar) only. */
export async function updateMyProfile(patch: { name?: string; phone?: string }): Promise<MyProfile> {
  const { data } = await API.patch('/user/me', patch);
  const profile: MyProfile = data?.data;

  // Keep the cached session user's display name in sync (no auth change)
  const cached = await getObject<Record<string, unknown>>(StorageKeys.user);
  if (cached && profile) {
    await setObject(StorageKeys.user, { ...cached, name: profile.name, phone: profile.phone });
  }
  return profile;
}

export async function getNotifications(limit = 50): Promise<NotificationFeed> {
  const { data } = await API.get('/user/me/notifications', { params: { limit } });
  return data?.data || { items: [], unread: 0 };
}

/** Marks everything read (the API stores one read-at watermark per user). */
export async function markNotificationsRead(): Promise<void> {
  await API.patch('/user/me/notifications/read');
}

/** Backend validation message when present, otherwise a fallback. */
export const apiError = (error: unknown, fallback: string): string =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export const timeAgo = (date: string): string => {
  const s = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
};
