import API from '@/services/api';

/**
 * Leads data access — mirrors the web Leads module (Leads.jsx) EXACTLY.
 *
 * The web page fetches every lead with `?limit=1000` and performs search,
 * filtering and pagination client-side, so this service does the same to keep
 * 100% business-logic parity. Endpoints and payloads are reused verbatim:
 *   GET    /leads?limit=1000       -> { data: Lead[] } | Lead[]
 *   GET    /leads/:id              -> Lead
 *   POST   /leads                  -> create (name required)
 *   PUT    /leads/:id              -> update (full payload, or { status } inline)
 *   DELETE /leads/:id              -> delete
 *   POST   /leads/:id/convert      -> { title, value } -> Opportunity
 *   POST   /leads/:id/message      -> { channel, subject, message }
 *   GET    /activities?lead=:id    -> { success, data: Activity[] }
 *   POST   /ai/lead-insight        -> { success, insight, model }
 */

/* Backend enum values (Backend/models/Lead.js) — same lists as the web page. */
export const LEAD_STATUS_OPTIONS = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Won',
  'Lost',
] as const;

/**
 * Legacy 4-bucket list used by the Salesforce dashboard (it mirrors the web
 * SalesforceDashboard, which still charts these four). Leads screens use
 * LEAD_STATUS_OPTIONS.
 */
export const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Closed'] as const;

export const LEAD_SOURCES = [
  'Website',
  'Referral',
  'Facebook',
  'Instagram',
  'LinkedIn',
  'Google Ads',
  'Email Campaign',
  'WhatsApp',
  'Phone Call',
  'Walk-In',
  'Other',
] as const;

export const LEAD_PRIORITIES = ['Low', 'Medium', 'High'] as const;

export const LEAD_DEPARTMENTS = [
  'Sales',
  'Marketing',
  'Support',
  'ERP',
  'CRM',
  'Digital Marketing',
] as const;

export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'] as const;

export type LeadStatus = (typeof LEAD_STATUS_OPTIONS)[number];
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

/** NativeWind class tokens copied from the web STATUS_STYLES map. */
export const STATUS_STYLES: Record<string, string> = {
  New: 'bg-blue-100 text-blue-700',
  Contacted: 'bg-amber-100 text-amber-700',
  Qualified: 'bg-green-100 text-green-700',
  Proposal: 'bg-purple-100 text-purple-700',
  Negotiation: 'bg-orange-100 text-orange-700',
  Won: 'bg-emerald-100 text-emerald-700',
  Lost: 'bg-red-100 text-red-700',
  Closed: 'bg-slate-200 text-slate-600',
};

export const PRIORITY_STYLES: Record<LeadPriority, string> = {
  High: 'bg-rose-100 text-rose-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-slate-100 text-slate-600',
};

export const PRIORITY_DOT: Record<LeadPriority, string> = {
  High: 'bg-rose-500',
  Medium: 'bg-amber-500',
  Low: 'bg-slate-400',
};

/** Stored priority, defaulting to Medium (identical to web priorityOf). */
export function priorityOf(lead?: { priority?: string } | null): LeadPriority {
  const p = lead?.priority;
  return (LEAD_PRIORITIES as readonly string[]).includes(p ?? '') ? (p as LeadPriority) : 'Medium';
}

export interface Lead {
  _id: string;
  name: string;
  designation?: string;
  email?: string;
  phone?: string;
  company?: string;
  industry?: string;
  website?: string;
  companySize?: string;
  requirement?: string;
  message?: string;
  status: string;
  source?: string;
  priority?: string;
  department?: string;
  /** User _id (stored as a string by the backend). */
  assignedTo?: string;
  owner?: { _id?: string; name?: string; email?: string } | string | null;
  value?: number;
  expectedValue?: number;
  followUpDate?: string | null;
  lastContactedAt?: string | null;
  nextFollowUpAt?: string | null;
  notes?: string;
  isConverted?: boolean;
  convertedAt?: string | null;
  convertedOpportunity?: { _id?: string; title?: string } | string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Editable form state — field-for-field the web EMPTY_FORM. */
export interface LeadInput {
  name: string;
  designation: string;
  email: string;
  phone: string;
  company: string;
  industry: string;
  website: string;
  companySize: string;
  requirement: string;
  message: string;
  status: string;
  source: string;
  priority: string;
  assignedTo: string;
  value: string;
  expectedValue: string;
  followUpDate: string;
  lastContactedAt: string;
  nextFollowUpAt: string;
  department: string;
  notes: string;
}

export const emptyLead: LeadInput = {
  name: '',
  designation: '',
  email: '',
  phone: '',
  company: '',
  industry: '',
  website: '',
  companySize: '',
  requirement: '',
  message: '',
  status: 'New',
  source: 'Website',
  priority: 'Medium',
  assignedTo: '',
  value: '',
  expectedValue: '',
  followUpDate: '',
  lastContactedAt: '',
  nextFollowUpAt: '',
  department: 'Sales',
  notes: '',
};

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const data = (payload as { data?: unknown })?.data;
  return Array.isArray(data) ? (data as T[]) : [];
}

/** Web saveLead() validation. */
export function validateLead(input: LeadInput): string | null {
  if (!input.name.trim()) return 'Lead name is required';
  for (const [key, label] of [
    ['value', 'Deal value'],
    ['expectedValue', 'Expected value'],
  ] as const) {
    const n = Number(input[key] || 0);
    if (Number.isNaN(n) || n < 0) return `${label} must be a positive number`;
  }
  return null;
}

/** Builds the request body exactly as the web saveLead() does. */
export function toLeadPayload(f: LeadInput): Record<string, unknown> {
  return {
    name: f.name.trim(),
    designation: f.designation.trim(),
    email: f.email.trim(),
    phone: f.phone.trim(),
    company: f.company.trim(),
    industry: f.industry.trim(),
    website: f.website.trim(),
    companySize: f.companySize || '',
    requirement: f.requirement.trim(),
    message: f.message.trim(),
    status: f.status || 'New',
    source: f.source || 'Website',
    priority: f.priority || 'Medium',
    assignedTo: f.assignedTo || '',
    value: Number(f.value || 0),
    expectedValue: Number(f.expectedValue || 0),
    followUpDate: f.followUpDate || null,
    lastContactedAt: f.lastContactedAt || null,
    nextFollowUpAt: f.nextFollowUpAt || null,
    department: f.department || 'Sales',
    notes: f.notes.trim(),
  };
}

export async function fetchLeads(): Promise<Lead[]> {
  const res = await API.get('/leads?limit=1000');
  return asArray<Lead>(res.data);
}

export async function fetchLead(id: string): Promise<Lead> {
  const { data } = await API.get(`/leads/${id}`);
  return (data?.data ?? data) as Lead;
}

/** Returns the API's success message (web toasts it). */
export async function createLead(input: LeadInput): Promise<string> {
  const { data } = await API.post('/leads', toLeadPayload(input));
  return data?.message || 'Lead created successfully';
}

export async function updateLead(id: string, input: LeadInput): Promise<string> {
  const { data } = await API.put(`/leads/${id}`, toLeadPayload(input));
  return data?.message || 'Lead updated successfully';
}

/** Inline status change — the web sends only `{ status }`. */
export async function updateLeadStatus(id: string, status: string): Promise<void> {
  await API.put(`/leads/${id}`, { status });
}

export async function deleteLead(id: string): Promise<void> {
  await API.delete(`/leads/${id}`);
}

/** Web convertLead(): creates an Opportunity named "<lead> Opportunity". */
export async function convertLead(lead: Lead): Promise<string> {
  const { data } = await API.post(`/leads/${lead._id}/convert`, {
    title: `${lead.name} Opportunity`,
    value: Number(lead.value || 0),
  });
  return data?.message || 'Lead converted successfully';
}

/** Build the editable form from a fetched lead (web openEditDrawer). */
export function toLeadInput(l: Lead): LeadInput {
  const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));
  return {
    name: str(l.name),
    designation: str(l.designation),
    email: str(l.email),
    phone: str(l.phone),
    company: str(l.company),
    industry: str(l.industry),
    website: str(l.website),
    companySize: str(l.companySize),
    requirement: str(l.requirement),
    message: str(l.message),
    status: l.status || 'New',
    source: l.source || 'Website',
    priority: l.priority || 'Medium',
    assignedTo: str(l.assignedTo),
    value: str(l.value),
    expectedValue: str(l.expectedValue),
    followUpDate: str(l.followUpDate),
    lastContactedAt: str(l.lastContactedAt),
    nextFollowUpAt: str(l.nextFollowUpAt),
    department: l.department || 'Sales',
    notes: str(l.notes),
  };
}

export interface LeadFilters {
  search: string;
  status: 'All' | string;
  source: 'All' | string;
  priority: 'All' | LeadPriority;
}

/** Client-side search + status/source/priority filters (matches filteredLeads). */
export function filterLeads(leads: Lead[], f: LeadFilters): Lead[] {
  const q = f.search.trim().toLowerCase();
  return leads
    .filter((l) =>
      !q
        ? true
        : `${l.name || ''} ${l.email || ''} ${l.phone || ''} ${l.company || ''}`.toLowerCase().includes(q)
    )
    .filter((l) => (f.status === 'All' ? true : l.status === f.status))
    .filter((l) => (f.source === 'All' ? true : l.source === f.source))
    .filter((l) => (f.priority === 'All' ? true : priorityOf(l) === f.priority));
}

/** Web KPI formulas: conversion rate = Won / Total. */
export function leadStats(leads: Lead[]) {
  const total = leads.length;
  const won = leads.filter((l) => l.status === 'Won').length;
  return {
    total,
    newLeads: leads.filter((l) => l.status === 'New').length,
    qualified: leads.filter((l) => l.status === 'Qualified').length,
    won,
    conversion: total ? Math.round((won / total) * 100) : 0,
  };
}

export const formatINR = (n?: number | string | null) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const formatDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '';

/* ---------------------------------------------------------------------------
 * Activity timeline — web fetchActivities(): GET /activities?lead=<id>
 * ------------------------------------------------------------------------- */
export interface LeadActivity {
  _id: string;
  type?: string;
  notes?: string;
  done?: boolean;
  priority?: string;
  outcome?: string;
  dueDate?: string | null;
  createdAt?: string;
  createdBy?: { name?: string } | null;
}

export async function fetchLeadActivities(leadId: string): Promise<LeadActivity[]> {
  const { data } = await API.get('/activities', { params: { lead: leadId } });
  return data?.success ? (data.data ?? []) : [];
}

/* ---------------------------------------------------------------------------
 * Lead communications — reuses the web CRM endpoint verbatim:
 *   POST /leads/:id/message  { channel, subject, message }
 * Email goes via Resend, SMS / WhatsApp via Twilio; the backend logs the Activity.
 * ------------------------------------------------------------------------- */
export type LeadMessageChannel = 'email' | 'sms' | 'whatsapp';

export interface LeadMessageResult {
  success: boolean;
  message?: string;
  data?: { channel: string; sid?: string; status?: string; to?: string };
}

export async function sendLeadMessage(
  id: string,
  channel: LeadMessageChannel,
  message: string,
  subject = ''
): Promise<LeadMessageResult> {
  const { data } = await API.post<LeadMessageResult>(`/leads/${id}/message`, {
    channel,
    subject,
    message,
  });
  return data;
}

/** Mirrors the backend check: 10-digit Indian mobile (opt. leading 0) or +E.164. */
export function isValidLeadPhone(phone?: string): boolean {
  const raw = String(phone ?? '').trim();
  if (!raw) return false;
  let digits = raw.replace(/\D/g, '');
  if (!raw.startsWith('+')) {
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length === 10) digits = `91${digits}`;
  }
  if (!/^[1-9]\d{7,14}$/.test(digits)) return false;
  return digits.startsWith('91') ? /^91[6-9]\d{9}$/.test(digits) : true;
}

/* ---------------------------------------------------------------------------
 * AI assistant — web aiService LEAD_AI_FEATURES / getLeadInsight
 * ------------------------------------------------------------------------- */
export const LEAD_AI_FEATURES = [
  { type: 'summary', label: 'Lead Summary', description: 'Executive overview of this lead', icon: 'file-text' },
  { type: 'recommendations', label: 'Sales Recommendations', description: 'How to move this deal forward', icon: 'target' },
  { type: 'quality', label: 'Lead Quality', description: 'Score, tier & conversion odds', icon: 'bar-chart-2' },
  { type: 'followup', label: 'Next Follow-up', description: 'Best next action & message', icon: 'calendar' },
  { type: 'sentiment', label: 'Sentiment', description: 'Customer mood & engagement', icon: 'smile' },
] as const;

export async function getLeadInsight(type: string, lead: Lead) {
  const { data } = await API.post('/ai/lead-insight', { type, lead });
  if (!data?.success) throw new Error(data?.message || 'Request failed');
  return data as { insight: string; model?: string };
}
