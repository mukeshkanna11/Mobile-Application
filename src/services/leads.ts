import API from '@/services/api';

/**
 * Leads data access — mirrors the web Leads module (Leads.jsx) EXACTLY.
 *
 * The web page fetches every lead with `?limit=1000` and performs search,
 * filtering and pagination client-side, so this service does the same to keep
 * 100% business-logic parity. Endpoints and payloads are reused verbatim:
 *   GET    /leads?limit=1000  -> { data: Lead[] } | Lead[]
 *   GET    /leads/:id         -> Lead
 *   POST   /leads             -> create (name required)
 *   PUT    /leads/:id         -> update
 *   DELETE /leads/:id         -> delete
 */

export const LEAD_STATUSES = [
  'New',
  'Contacted',
  'Qualified',
  'Closed',
] as const;

export const LEAD_SOURCES = [
  'Website',
  'Referral',
  'Social Media',
  'Email',
  'Cold Call',
  'Event',
  'Other',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadPriority = 'High' | 'Medium' | 'Low';

/** NativeWind class tokens copied from the web STATUS_STYLES map. */
export const STATUS_STYLES: Record<string, string> = {
  New: 'bg-blue-100 text-blue-700',
  Contacted: 'bg-amber-100 text-amber-700',
  Qualified: 'bg-green-100 text-green-700',
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

/** Display-only priority derived from status (identical to web priorityOf). */
export function priorityOf(status?: string): LeadPriority {
  if (status === 'Qualified') return 'High';
  if (status === 'Contacted') return 'Medium';
  return 'Low';
}

export interface Lead {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status: string;
  source?: string;
  notes?: string;
  priority?: LeadPriority;
  // Web-only extended fields (sent verbatim; not all persisted by the schema).
  designation?: string;
  industry?: string;
  website?: string;
  companySize?: string;
  assignedTo?: string;
  expectedValue?: string | number;
  followUpDate?: string;
  leadScore?: number;
  value?: number;
  isConverted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Editable payload — base fields match the web EMPTY_FORM. */
export interface LeadInput {
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  source: string;
  notes: string;
  designation?: string;
  industry?: string;
  website?: string;
  companySize?: string;
  priority?: LeadPriority;
  assignedTo?: string;
  expectedValue?: string;
  followUpDate?: string;
}

export const emptyLead: LeadInput = {
  name: '',
  email: '',
  phone: '',
  company: '',
  status: 'New',
  source: 'Website',
  notes: '',
};

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const data = (payload as { data?: unknown })?.data;
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function fetchLeads(): Promise<Lead[]> {
  const res = await API.get('/leads?limit=1000');
  return asArray<Lead>(res.data);
}

export async function fetchLead(id: string): Promise<Lead> {
  const { data } = await API.get(`/leads/${id}`);
  return (data?.data ?? data) as Lead;
}

export async function createLead(input: LeadInput): Promise<Lead> {
  const { data } = await API.post('/leads', input);
  return (data?.data ?? data) as Lead;
}

export async function updateLead(
  id: string,
  input: Partial<Lead> | LeadInput
): Promise<Lead> {
  const { data } = await API.put(`/leads/${id}`, input);
  return (data?.data ?? data) as Lead;
}

export async function deleteLead(id: string): Promise<void> {
  await API.delete(`/leads/${id}`);
}

/** Build an editable payload from a fetched lead (for the edit form). */
export function toLeadInput(l: Lead): LeadInput {
  return {
    name: l.name ?? '',
    email: l.email ?? '',
    phone: l.phone ?? '',
    company: l.company ?? '',
    status: l.status ?? 'New',
    source: l.source ?? 'Website',
    notes: l.notes ?? '',
    designation: l.designation ?? '',
    industry: l.industry ?? '',
    website: l.website ?? '',
    companySize: l.companySize ?? '',
    priority: l.priority ?? 'Medium',
    assignedTo: l.assignedTo ?? '',
    expectedValue:
      l.expectedValue !== undefined && l.expectedValue !== null
        ? String(l.expectedValue)
        : '',
    followUpDate: l.followUpDate ?? '',
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
      `${l.name} ${l.email ?? ''} ${l.phone ?? ''} ${l.company ?? ''}`
        .toLowerCase()
        .includes(q)
    )
    .filter((l) => (f.status === 'All' ? true : l.status === f.status))
    .filter((l) => (f.source === 'All' ? true : l.source === f.source))
    .filter((l) =>
      f.priority === 'All' ? true : priorityOf(l.status) === f.priority
    );
}
