import API from '@/services/api';

/**
 * Email mailbox — the same workspace-scoped endpoints as the web Mail
 * workspace (Frontend/src/pages/Integrations/mail/mailApi.js):
 *   GET /email/mailbox/summary · GET /email/mailbox/messages · GET /email/mailbox/messages/:id
 *   PATCH /email/mailbox/messages/:id (read/starred/archived/trashed) · DELETE /email/mailbox/messages/:id
 *   POST /email/mailbox/drafts · PUT /email/mailbox/drafts/:id · POST /email/mailbox/send · POST /email/mailbox/sync
 * Sending always goes through the workspace's connected mailbox on the server.
 */
const BASE = '/email/mailbox';

export const MAIL_FOLDERS = ['inbox', 'sent', 'drafts', 'starred', 'archived', 'trash'] as const;
export type MailFolder = (typeof MAIL_FOLDERS)[number];

export interface MailItem {
  id: string;
  status?: string;
  direction?: 'inbound' | 'outbound';
  from?: string;
  fromName?: string;
  to?: string[];
  cc?: string[];
  subject?: string;
  snippet?: string;
  date?: string;
  read?: boolean;
  starred?: boolean;
  archived?: boolean;
  trashed?: boolean;
  attachmentCount?: number;
  threadKey?: string;
  accountEmail?: string;
  error?: string | null;
}

export interface MailMessage extends MailItem {
  bcc?: string[];
  html?: string;
  text?: string;
  account?: string | null;
  attachments?: { id: string | null; filename: string; contentType?: string; size?: number; downloadable?: boolean }[];
}

export interface MailSummary {
  accounts?: { id: string; email: string; providerName?: string; isDefault?: boolean }[];
  inbox?: { available?: boolean; reason?: string | null };
  /** Per mailbox: inbox access + sync state (drives "Enable inbox sync" / "Add IMAP") */
  capabilities?: {
    accountId: string;
    inbox?: boolean;
    inboxReason?: string | null;
    sync?: { status?: string; canEnable?: boolean; lastSuccessAt?: string | null; lastError?: string | null };
  }[];
  counts?: Partial<Record<'inboxUnread' | 'drafts' | 'starred' | 'archived' | 'trash' | 'sent' | 'failed', number>>;
}

export interface MailDraft {
  accountId?: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
}

export const fetchMailSummary = async (): Promise<MailSummary> => (await API.get(`${BASE}/summary`)).data?.data ?? {};

export async function fetchMail(params: { folder: MailFolder; q?: string; page?: number; unread?: boolean }) {
  const { data } = await API.get(`${BASE}/messages`, {
    params: { folder: params.folder, page: params.page ?? 1, ...(params.q?.trim() ? { q: params.q.trim() } : {}), ...(params.unread ? { unread: '1' } : {}) },
  });
  return (data?.data ?? { items: [] }) as { items: MailItem[]; page?: number; pageSize?: number; total?: number };
}

export const fetchMailMessage = async (id: string): Promise<MailMessage> => (await API.get(`${BASE}/messages/${id}`)).data?.data;

export const updateMailFlags = (id: string, patch: Partial<Pick<MailItem, 'read' | 'starred' | 'archived' | 'trashed'>>) =>
  API.patch(`${BASE}/messages/${id}`, patch);

export const deleteMail = (id: string) => API.delete(`${BASE}/messages/${id}`);

export const syncMailbox = async () => (await API.post(`${BASE}/sync`, {}, { timeout: 60000 })).data?.data;

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* Plain-text body → the HTML the server expects (it sanitises again and derives the text part) */
const toPayload = (d: MailDraft) => ({
  accountId: d.accountId || undefined,
  to: d.to,
  cc: d.cc,
  bcc: d.bcc,
  subject: d.subject,
  html: d.body
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join(''),
});

export async function saveMailDraft(d: MailDraft, draftId?: string): Promise<{ id: string }> {
  const { data } = draftId
    ? await API.put(`${BASE}/drafts/${draftId}`, toPayload(d), { timeout: 60000 })
    : await API.post(`${BASE}/drafts`, toPayload(d), { timeout: 60000 });
  return data?.data;
}

export async function sendMail(d: MailDraft, opts: { draftId?: string; clientId: string }): Promise<string | undefined> {
  const { data } = await API.post(
    `${BASE}/send`,
    { ...toPayload(d), clientId: opts.clientId, draftId: opts.draftId || undefined },
    { timeout: 90000 }
  );
  return data?.message;
}

/* Readable body: server text part, else tags stripped from the (sanitised) HTML */
export const mailBodyText = (m: MailMessage) =>
  (m.text ||
    (m.html || '')
      .replace(/<(style|script)[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')).trim();

export const newClientId = () => `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
