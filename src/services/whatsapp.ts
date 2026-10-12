import API from '@/services/api';

/**
 * WhatsApp Inbox data access — mirrors the web services/whatsappService.js
 * (pages/Integrations/WhatsAppInbox.jsx) using the existing backend only:
 *   GET   /whatsapp/conversations?page&limit&search&unread=true
 *           -> { success, data: Conversation[], pagination }   (limit ≤ 50)
 *   GET   /whatsapp/conversations/:id/messages?page&limit
 *           -> { success, data: { conversation, messages (oldest-first) }, pagination }  (limit ≤ 100)
 *   POST  /whatsapp/conversations/:id/messages  { text }
 *           -> 201 { success, data: Message }
 *           -> 409 { code: 'WINDOW_EXPIRED', message }  (24-hour window closed)
 *   PATCH /whatsapp/conversations/:id/read      -> { success, data: Conversation }
 * Account sync/subscribe (admin Meta setup) and webhooks are web/backend only.
 */

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Conversation {
  _id: string;
  phoneNumber: string;
  profileName?: string | null;
  unreadCount: number;
  status?: string;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  lastMessageDirection?: 'inbound' | 'outbound' | null;
  lastInboundAt?: string | null;
  window?: { open: boolean; expiresAt?: string | null };
  lead?: { _id: string; name?: string; company?: string; status?: string } | null;
  client?: { _id: string; companyName?: string; contactPerson?: string } | null;
  assignedTo?: { _id: string; name?: string; email?: string } | null;
  createdAt?: string;
}

export interface WhatsAppMessage {
  _id: string;
  direction: 'inbound' | 'outbound';
  type?: string;
  body: string;
  timestamp: string;
  status?: MessageStatus;
  error?: { code?: string | null; title?: string | null; message?: string | null } | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export async function fetchConversations({
  page = 1,
  limit = 20,
  search = '',
  unread = false,
}: { page?: number; limit?: number; search?: string; unread?: boolean } = {}) {
  const { data } = await API.get('/whatsapp/conversations', {
    params: {
      page,
      limit,
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(unread ? { unread: 'true' } : {}),
    },
  });
  return {
    items: (data?.data ?? []) as Conversation[],
    pagination: data?.pagination as Pagination | undefined,
  };
}

export async function fetchMessages(id: string, { page = 1, limit = 30 } = {}) {
  const { data } = await API.get(`/whatsapp/conversations/${id}/messages`, {
    params: { page, limit },
  });
  return {
    conversation: (data?.data?.conversation ?? null) as Conversation | null,
    messages: (data?.data?.messages ?? []) as WhatsAppMessage[],
    pagination: data?.pagination as Pagination | undefined,
  };
}

export async function sendWhatsAppMessage(id: string, text: string): Promise<WhatsAppMessage> {
  const { data } = await API.post(`/whatsapp/conversations/${id}/messages`, { text });
  return data?.data as WhatsAppMessage;
}

export async function markConversationRead(id: string): Promise<void> {
  await API.patch(`/whatsapp/conversations/${id}/read`);
}

/** Backend error code when the 24-hour customer service window has closed. */
export const isWindowExpired = (err: unknown) =>
  (err as { response?: { data?: { code?: string } } })?.response?.data?.code === 'WINDOW_EXPIRED';

export const conversationName = (c: Conversation) =>
  c.profileName || c.lead?.name || c.client?.companyName || c.phoneNumber;

/** "10:42" for today, "Mon" within a week, else "12 Oct". */
export function shortTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (now.getTime() - d.getTime() < 6 * 86400000)
    return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/** Merge by _id keeping order by timestamp (used for "load older" + polling). */
export function mergeMessages(a: WhatsAppMessage[], b: WhatsAppMessage[]): WhatsAppMessage[] {
  const map = new Map<string, WhatsAppMessage>();
  [...a, ...b].forEach((m) => map.set(m._id, m));
  return [...map.values()].sort(
    (x, y) => new Date(x.timestamp).getTime() - new Date(y.timestamp).getTime()
  );
}
