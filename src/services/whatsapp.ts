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
 *   PATCH /whatsapp/conversations/:id   { status?: Open|Pending|Closed, assignedTo?: userId|null }
 *   POST  /whatsapp/conversations/:id/notes { body }  -> { data: Conversation } (internal, never sent)
 *   POST  /whatsapp/conversations/:id/lead           -> { data: Conversation } (links/creates a Lead once)
 *   GET   /whatsapp/conversations/:id/messages/:messageId/media  -> media bytes (auth proxy)
 *   GET   /whatsapp/assignees                        -> { data: [{ _id, name, email, role }] } (workspace users)
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
  notes?: ConversationNote[];
  channel?: string;
  createdAt?: string;
}

export interface ConversationNote {
  _id: string;
  body: string;
  authorName?: string;
  createdAt: string;
}

export const CONVERSATION_STATUSES = ['Open', 'Pending', 'Closed'] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export interface Assignee {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface WhatsAppMessage {
  _id: string;
  direction: 'inbound' | 'outbound';
  type?: string;
  body: string;
  timestamp: string;
  status?: MessageStatus;
  error?: { code?: string | null; title?: string | null; message?: string | null } | null;
  /** WhatsApp media (fetched via the auth proxy) or IG/Messenger CDN attachments */
  meta?: {
    type?: string;
    mediaId?: string | null;
    mimeType?: string | null;
    filename?: string | null;
    attachments?: { type?: string; url?: string }[];
  } | null;
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

/** Outbound attachment — same payload as the web: data URL + MIME type + file name. */
export interface OutboundMedia {
  data: string;
  mimeType: string;
  filename: string;
}

export async function sendWhatsAppMessage(id: string, text: string, media?: OutboundMedia | null): Promise<WhatsAppMessage> {
  const { data } = await API.post(`/whatsapp/conversations/${id}/messages`, { text, ...(media ? { media } : {}) });
  return data?.data as WhatsAppMessage;
}

/* Mirrors the backend OUTBOUND_RULES (WhatsApp Cloud API limits). The request
   body is JSON (base64, ~33% larger) under the server's 10 MB body limit, so
   the effective cap is ~7 MB for every type — same as the website. */
const MB = 1024 * 1024;
const BODY_CAP = 7 * MB;
const OUTBOUND_RULES: [RegExp, string, number][] = [
  [/^image\/(jpeg|png)$/, 'image', 5 * MB],
  [/^video\/(mp4|3gpp)$/, 'video', 16 * MB],
  [/^audio\/(aac|amr|mpeg|mp4|ogg)$/, 'audio', 16 * MB],
  [/^(application\/pdf|text\/plain|application\/msword|application\/vnd\.ms-(excel|powerpoint)|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation))$/, 'document', 100 * MB],
];

/** MIME types offered by the picker. */
export const OUTBOUND_MIME_TYPES = [
  'image/jpeg', 'image/png', 'video/mp4', 'video/3gpp',
  'audio/aac', 'audio/amr', 'audio/mpeg', 'audio/mp4', 'audio/ogg',
  'application/pdf', 'text/plain', 'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

/** Client-side check before upload; the backend validates again. */
export function outboundMediaError(mimeType?: string | null, size?: number | null): string | null {
  const rule = OUTBOUND_RULES.find(([re]) => re.test(String(mimeType || '')));
  if (!rule) return 'WhatsApp accepts JPEG/PNG, MP4, AAC/MP3/OGG audio, PDF and Office documents.';
  const limit = Math.min(rule[2], BODY_CAP);
  if (size && size > limit) return `File is too large — maximum ${Math.round(limit / MB)} MB for ${rule[1]}s.`;
  return null;
}

export async function markConversationRead(id: string): Promise<void> {
  await API.patch(`/whatsapp/conversations/${id}/read`);
}

export async function updateConversation(
  id: string,
  patch: { status?: ConversationStatus; assignedTo?: string | null }
): Promise<Conversation> {
  const { data } = await API.patch(`/whatsapp/conversations/${id}`, patch);
  return data?.data as Conversation;
}

export async function addConversationNote(id: string, body: string): Promise<Conversation> {
  const { data } = await API.post(`/whatsapp/conversations/${id}/notes`, { body });
  return data?.data as Conversation;
}

export async function convertConversationToLead(id: string): Promise<Conversation> {
  const { data } = await API.post(`/whatsapp/conversations/${id}/lead`);
  return data?.data as Conversation;
}

export async function fetchAssignees(): Promise<Assignee[]> {
  const { data } = await API.get('/whatsapp/assignees');
  return (data?.data ?? []) as Assignee[];
}

/** Absolute URL of the authenticated media proxy (send with the Bearer token). */
export const mediaUrl = (conversationId: string, messageId: string) =>
  `${API.defaults.baseURL ?? ''}/whatsapp/conversations/${conversationId}/messages/${messageId}/media`;

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
