import API from '@/services/api';

/**
 * Meta Integration — mirrors the web services/metaService.js
 * (pages/Integrations/MetaIntegration.jsx) using the existing backend only:
 *   GET  /meta/status                 (any signed-in user) -> { data: MetaStatus }
 *   GET  /meta/oauth/url    (admin)   -> { data: { url } }
 *   POST /meta/refresh      (admin)   -> { data: MetaStatus }
 *   POST /meta/disconnect   (admin)   -> { data: MetaStatus }
 *   POST /whatsapp/sync     (admin)   -> account sync, then re-read status
 * Tokens never leave the server; the status only reports presence/expiry.
 * The OAuth callback redirects to the web app (CLIENT_URL), so mobile opens
 * the URL in the browser and re-reads the status when the user returns.
 */

export interface MetaStatus {
  connected?: boolean;
  status?: string;
  lastError?: string | null;
  businessPortfolioId?: string | null;
  connectedAt?: string | null;
  lastSyncedAt?: string | null;
  token?: { present?: boolean; expired?: boolean; expiresAt?: string | null };
  config?: {
    configured?: boolean;
    missingEnv?: string[];
    businessPortfolioId?: string;
    apiVersion?: string;
    redirectUri?: string;
  };
  facebookPage?: { connected?: boolean; name?: string; id?: string; tokenPresent?: boolean };
  instagram?: { connected?: boolean; username?: string; name?: string; id?: string };
  whatsapp?: {
    connected?: boolean;
    displayPhoneNumber?: string;
    verifiedName?: string;
    phoneNumberId?: string;
    wabaId?: string;
    qualityRating?: string;
    webhookSubscribed?: boolean;
    lastInboundAt?: string | null;
    lastSyncedAt?: string | null;
    lastError?: string | null;
  };
}

export async function fetchMetaStatus(): Promise<MetaStatus> {
  const { data } = await API.get('/meta/status');
  return data?.data ?? {};
}

export async function fetchMetaOAuthUrl(): Promise<string | undefined> {
  const { data } = await API.get('/meta/oauth/url');
  return data?.data?.url;
}

export async function refreshMeta(): Promise<MetaStatus> {
  const { data } = await API.post('/meta/refresh');
  return data?.data ?? {};
}

export async function disconnectMeta(): Promise<MetaStatus> {
  const { data } = await API.post('/meta/disconnect');
  return data?.data ?? {};
}

export async function syncWhatsAppAccount(): Promise<void> {
  await API.post('/whatsapp/sync');
}

/** Server message, or a role hint on 403 (admin-only actions). */
export function metaErrorMessage(err: unknown, fallback: string): string {
  const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
  if (res?.status === 403) return 'Only admins can manage the Meta connection.';
  return res?.data?.message || fallback;
}

export const formatMetaDate = (v?: string | null) => (v ? new Date(v).toLocaleString() : null);
