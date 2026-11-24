import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import API from '@/services/api';

/**
 * Integrations — the same workspace-scoped endpoints the website's
 * Integrations pages use (Frontend/src/pages/Integrations/*). Nothing new on
 * the backend; admin-only actions are enforced server-side (403).
 *
 *   Instagram  GET /meta/oauth/url?for=instagram · POST /meta/instagram/{reconnect,refresh,subscribe,disconnect}
 *   WhatsApp   POST /whatsapp/connect {phoneNumberId,wabaId,accessToken} · POST /whatsapp/disconnect · POST /whatsapp/sync
 *   Email      GET /email/status · GET /email/oauth/:provider/url · POST /email/smtp · PUT /email/accounts/:id/smtp
 *              POST /email/accounts/:id/{default,test} · DELETE /email/accounts/:id
 *   Shopify    GET /shopify/status · GET /shopify/oauth/url?shop · POST /shopify/disconnect
 *              /shopify/inventory/{locations,preview,settings,sync} · /shopify/events · POST /shopify/webhooks/register
 *   Meta Page  POST /meta/subscribe-page
 */

export const apiMessage = (err: unknown, fallback: string): string => {
  const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
  if (res?.status === 403) return 'Only admins can manage this integration.';
  return res?.data?.message || fallback;
};

/* --------------------------- OAuth (all providers) --------------------------- */
/** App link the auth session listens for: mobileapplication://integrations */
export const OAUTH_RETURN_URL = Linking.createURL('integrations');

/**
 * Opens a provider sign-in in an in-app auth session. The backend callback
 * finishes the connection server-side (state is bound to this admin + workspace)
 * and then shows the web result page; closing it — or an app link back —
 * resolves this promise so the caller re-reads the real status from the API.
 */
export async function openOAuth(url: string): Promise<void> {
  try {
    await WebBrowser.openAuthSessionAsync(url, OAUTH_RETURN_URL);
  } finally {
    WebBrowser.dismissAuthSession();
  }
}

/* ------------------------------ Instagram ------------------------------ */
export interface InstagramStatus {
  connected?: boolean;
  method?: 'facebook_page' | 'instagram_login' | null;
  source?: string | null;
  username?: string | null;
  expired?: boolean;
  pageReconnectable?: boolean;
  tokenPresent?: boolean;
  webhookSubscribed?: boolean;
  webhookVerifiable?: boolean;
  lastInboundAt?: string | null;
  lastError?: string | null;
}

export async function fetchInstagramStatus(): Promise<InstagramStatus | null> {
  const { data } = await API.get('/meta/status');
  return data?.data?.instagramInbox ?? null;
}

/** Existing Meta Facebook Login, flagged as an Instagram connect (returns to Instagram). */
export async function instagramOAuthUrl(): Promise<string | undefined> {
  const { data } = await API.get('/meta/oauth/url', { params: { for: 'instagram' } });
  return data?.data?.url;
}

const igPost = async (action: 'reconnect' | 'refresh' | 'subscribe' | 'disconnect'): Promise<InstagramStatus> => {
  const { data } = await API.post(`/meta/instagram/${action}`);
  return data?.data ?? {};
};
export const reconnectInstagramPage = () => igPost('reconnect');
export const refreshInstagram = () => igPost('refresh');
export const subscribeInstagram = () => igPost('subscribe');
export const disconnectInstagram = () => igPost('disconnect');

/* ------------------------------ WhatsApp ------------------------------ */
export async function connectWhatsApp(input: { phoneNumberId: string; wabaId: string; accessToken: string }) {
  const { data } = await API.post('/whatsapp/connect', input);
  return data;
}

export async function disconnectWhatsApp() {
  const { data } = await API.post('/whatsapp/disconnect');
  return data;
}

/* ------------------------------ Meta Page ------------------------------ */
export async function subscribeMetaPage(): Promise<void> {
  await API.post('/meta/subscribe-page');
}

/* -------------------------------- Email -------------------------------- */
export interface EmailProvider {
  id: string;
  kind: 'oauth' | 'smtp' | string;
  name: string;
  available: boolean;
  limitations?: string;
}

export interface EmailAccount {
  id: string;
  provider: string;
  providerName: string;
  email: string;
  displayName?: string;
  isDefault: boolean;
  status?: string;
  lastError?: string | null;
  lastUsedAt?: string | null;
  lastTestedAt?: string | null;
  smtp?: { host?: string; port?: number; security?: string; username?: string };
  imap?: { enabled?: boolean; host?: string | null; port?: number | null; security?: string | null };
}

export interface EmailStatus {
  providers: EmailProvider[];
  accounts: EmailAccount[];
}

export async function fetchEmailStatus(): Promise<EmailStatus> {
  const { data } = await API.get('/email/status');
  return { providers: data?.data?.providers ?? [], accounts: data?.data?.accounts ?? [] };
}

/** `hint` pre-fills the provider sign-in; `inbox` adds read-only inbox access (web "Enable inbox sync"). */
export async function emailOAuthUrl(provider: string, opts: { hint?: string; inbox?: boolean } = {}): Promise<string | undefined> {
  const { data } = await API.get(`/email/oauth/${provider}/url`, {
    params: { ...(opts.hint ? { email: opts.hint } : {}), ...(opts.inbox ? { inbox: '1' } : {}) },
  });
  return data?.data?.url;
}

export interface MailSettings {
  label?: string;
  smtp?: { host?: string; port?: number; security?: string };
  imap?: { host?: string; port?: number; security?: string } | null;
}

/** Same as the web "Continue" step: which provider owns this address (+ SMTP/IMAP suggestion). */
export async function detectEmailProvider(email: string): Promise<{ provider: string | null; available: boolean | null; settings?: MailSettings }> {
  const { data } = await API.get('/email/detect', { params: { email } });
  return data?.data ?? { provider: null, available: null };
}

/** SMTP form pre-filled from a detected custom-domain suggestion. */
export const smtpFromSuggestion = (email: string, s?: MailSettings): SmtpForm => ({
  ...emptySmtp(),
  email,
  host: s?.smtp?.host ?? '',
  port: String(s?.smtp?.port ?? 465),
  security: (s?.smtp?.security as SmtpForm['security']) ?? 'ssl',
  imapEnabled: !!s?.imap,
  imapHost: s?.imap?.host ?? '',
  imapPort: String(s?.imap?.port ?? 993),
  imapSecurity: (s?.imap?.security as SmtpForm['imapSecurity']) ?? 'ssl',
});

export interface SmtpForm {
  email: string;
  displayName: string;
  host: string;
  port: string;
  security: 'ssl' | 'starttls';
  username: string;
  password: string;
  imapEnabled: boolean;
  imapHost: string;
  imapPort: string;
  imapSecurity: 'ssl' | 'starttls';
}

export const emptySmtp = (a?: EmailAccount): SmtpForm => ({
  email: a?.email ?? '',
  displayName: a?.displayName ?? '',
  host: a?.smtp?.host ?? '',
  port: String(a?.smtp?.port ?? 465),
  security: (a?.smtp?.security as SmtpForm['security']) ?? 'ssl',
  username: a?.smtp?.username ?? '',
  password: '',
  imapEnabled: !!a?.imap?.enabled,
  imapHost: a?.imap?.host ?? '',
  imapPort: String(a?.imap?.port ?? 993),
  imapSecurity: (a?.imap?.security as SmtpForm['imapSecurity']) ?? 'ssl',
});

/** Same checks and payload as the website's SMTP dialog. */
export function smtpFormError(f: SmtpForm, editing: boolean): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return 'Enter a valid email address.';
  if (!f.host.trim()) return 'Enter the SMTP host from your email provider.';
  if (!editing && !f.password) return 'Enter the mailbox password.';
  if (f.imapEnabled && !f.imapHost.trim()) return 'Enter the IMAP host from your email provider, or turn off receiving.';
  return null;
}

export async function saveSmtpAccount(f: SmtpForm, accountId?: string): Promise<EmailAccount> {
  const { imapEnabled, imapHost, imapSecurity, imapPort, ...rest } = f;
  const payload = {
    ...rest,
    email: f.email.trim(),
    host: f.host.trim(),
    port: Number(f.port),
    username: f.username.trim() || f.email.trim(),
    imap: imapEnabled ? { enabled: true, host: imapHost.trim(), security: imapSecurity, port: Number(imapPort) } : { enabled: false },
  };
  const { data } = accountId
    ? await API.put(`/email/accounts/${accountId}/smtp`, payload)
    : await API.post('/email/smtp', payload);
  return data?.data;
}

export const setDefaultEmail = (id: string) => API.post(`/email/accounts/${id}/default`);
export const testEmailAccount = async (id: string): Promise<string | undefined> =>
  (await API.post(`/email/accounts/${id}/test`)).data?.message;
export const deleteEmailAccount = (id: string) => API.delete(`/email/accounts/${id}`);

/* ------------------------------- Shopify ------------------------------- */
export interface ShopifyStatus {
  available?: boolean;
  connection?: {
    connected?: boolean;
    shopDomain?: string | null;
    shop?: { name?: string | null; email?: string | null; plan?: string | null } | null;
    status?: string | null;
    missingScopes?: string[];
    connectedAt?: string | null;
    lastError?: string | null;
    webhooks?: { registered?: string[]; lastError?: string | null } | null;
    inventory?: ShopifyInventorySettings | null;
  } | null;
  installUrl?: string | null;
  orders?: { total?: number; needsAttention?: number; recent?: ShopifyOrder[] } | null;
  inbox?: { counts?: Record<string, number> } | null;
}

export interface ShopifyOrder {
  _id: string;
  orderName?: string;
  status?: string;
  financialStatus?: string;
  salesOrder?: { soNumber?: string; status?: string } | null;
  financials?: { total: number; digits: number; currency?: string; outstanding?: number } | null;
  issues?: string[];
}

export interface ShopifyInventorySettings {
  enabled?: boolean;
  warehouse?: string | null;
  locationGid?: string | null;
  locationName?: string | null;
  lastSyncAt?: string | null;
  lastError?: string | null;
}

export interface ShopifyEvent {
  _id: string;
  topic?: string;
  status?: string;
  attempts?: number;
  lastError?: string | null;
  createdAt?: string;
}

/* Integer minor units → "1180.00 INR" (same as the web page) */
export const shopifyMoney = (minor = 0, digits = 2, currency = '') => {
  const abs = String(Math.abs(minor)).padStart(digits + 1, '0');
  const value = digits ? `${abs.slice(0, -digits)}.${abs.slice(-digits)}` : abs;
  return `${minor < 0 ? '-' : ''}${value} ${currency}`.trim();
};

/* Store address → "<handle>.myshopify.com" (web components/shopify/storeInput.js; backend validates again) */
export function normalizeShopInput(input: string): string | null {
  const raw = String(input || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
  const admin = raw.match(/^admin\.shopify\.com\/store\/([a-z0-9][a-z0-9-]*)(?:[/?#]|$)/);
  let shop = admin ? `${admin[1]}.myshopify.com` : raw.replace(/[/?#].*$/, '');
  if (shop && !shop.includes('.')) shop = `${shop}.myshopify.com`;
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop) ? shop : null;
}

export async function shopifyOAuthUrl(shop: string): Promise<string | undefined> {
  const { data } = await API.get('/shopify/oauth/url', { params: { shop } });
  return data?.data?.url;
}

export async function fetchShopifyLocations(): Promise<{ id: string; name: string }[]> {
  const { data } = await API.get('/shopify/inventory/locations');
  return data?.data ?? [];
}

export async function previewShopifyInventory(): Promise<{ totals?: Record<string, number> } | null> {
  const { data } = await API.get('/shopify/inventory/preview');
  return data?.data ?? null;
}

export async function saveShopifyInventory(input: { enabled: boolean; warehouse: string | null; locationGid: string | null }): Promise<string | undefined> {
  const { data } = await API.put('/shopify/inventory/settings', input);
  return data?.message;
}

export async function syncShopifyInventory(): Promise<string | undefined> {
  const { data } = await API.post('/shopify/inventory/sync');
  const mapped = data?.data?.mapping?.mapped;
  return `${data?.message || 'Inventory synced'}${mapped != null ? ` · ${mapped} SKU(s) matched` : ''}`;
}

export async function fetchShopifyEvents(page = 1): Promise<{ items: ShopifyEvent[]; total?: number; pages?: number }> {
  const { data } = await API.get('/shopify/events', { params: { page, limit: 20 } });
  return data?.data ?? { items: [] };
}

export const retryShopifyEvent = (id: string) => API.post(`/shopify/events/${id}/retry`);

export async function registerShopifyWebhooks(): Promise<string | undefined> {
  const { data } = await API.post('/shopify/webhooks/register');
  return data?.message;
}

export async function fetchShopifyStatus(): Promise<ShopifyStatus> {
  const { data } = await API.get('/shopify/status');
  return data?.data ?? {};
}

export async function disconnectShopify(): Promise<void> {
  await API.post('/shopify/disconnect');
}
