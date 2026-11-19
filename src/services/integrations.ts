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
 *   Shopify    GET /shopify/status · POST /shopify/disconnect
 *   Meta Page  POST /meta/subscribe-page
 */

export const apiMessage = (err: unknown, fallback: string): string => {
  const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
  if (res?.status === 403) return 'Only admins can manage this integration.';
  return res?.data?.message || fallback;
};

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

export async function emailOAuthUrl(provider: string): Promise<string | undefined> {
  const { data } = await API.get(`/email/oauth/${provider}/url`);
  return data?.data?.url;
}

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
  } | null;
  orders?: Record<string, unknown> | null;
  inventory?: Record<string, unknown> | null;
}

export async function fetchShopifyStatus(): Promise<ShopifyStatus> {
  const { data } = await API.get('/shopify/status');
  return data?.data ?? {};
}

export async function disconnectShopify(): Promise<void> {
  await API.post('/shopify/disconnect');
}
