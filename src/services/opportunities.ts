import API from '@/services/api';

/**
 * Opportunities data access — reuses the existing backend EXACTLY
 * (routes/opportunities.routes.js). The backend applies server-side
 * search / stage filter / pagination and always scopes to
 * department = "Salesforce".
 *
 *   GET    /opportunities?page=&limit=&search=&stage=
 *          -> { success, data: Opportunity[], pagination }
 *   GET    /opportunities/:id            -> { data } (lead + assignedTo populated)
 *   POST   /opportunities                -> create (title + lead required)
 *   PUT    /opportunities/:id            -> update
 *   DELETE /opportunities/:id            -> delete
 *   GET    /opportunities/dashboard/stats-> { stats }
 */

/** Full model enum (used for create/edit). */
export const STAGES = [
  'Prospecting',
  'Qualification',
  'Needs Analysis',
  'Value Proposition',
  'Proposal',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
] as const;

/** Stage filter options, matching the web OpportunitiesTab STAGES list. */
export const FILTER_STAGES = [
  'Prospecting',
  'Proposal',
  'Closed Won',
  'Closed Lost',
] as const;

export type Stage = (typeof STAGES)[number];

/** Tailwind tokens per stage (bg + text). */
export const STAGE_STYLES: Record<string, string> = {
  Prospecting: 'bg-sky-100 text-sky-700',
  Qualification: 'bg-indigo-100 text-indigo-700',
  'Needs Analysis': 'bg-violet-100 text-violet-700',
  'Value Proposition': 'bg-purple-100 text-purple-700',
  Proposal: 'bg-amber-100 text-amber-700',
  Negotiation: 'bg-orange-100 text-orange-700',
  'Closed Won': 'bg-emerald-100 text-emerald-700',
  'Closed Lost': 'bg-rose-100 text-rose-700',
};

export interface Opportunity {
  _id: string;
  title: string;
  lead?: any;
  value?: number;
  probability?: number;
  expectedCloseDate?: string;
  stage?: string;
  assignedTo?: any;
  department?: string;
  notes?: string;
  isActive?: boolean;
  lastActivityDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OpportunityStats {
  total: number;
  prospecting: number;
  proposal: number;
  won: number;
  lost: number;
  revenue: number;
}

export interface OpportunityInput {
  title: string;
  lead: string;
  value: string;
  probability: string;
  stage: Stage;
  expectedCloseDate: string;
  notes: string;
}

export const emptyOpportunity: OpportunityInput = {
  title: '',
  lead: '',
  value: '',
  probability: '',
  stage: 'Prospecting',
  expectedCloseDate: '',
  notes: '',
};

export function formatMoney(x: unknown): string {
  return `₹${Number(x || 0).toLocaleString('en-IN')}`;
}

export interface FetchParams {
  page?: number;
  limit?: number;
  search?: string;
  stage?: string;
}

export async function fetchOpportunities(
  params: FetchParams = {}
): Promise<{ data: Opportunity[]; pagination: Pagination }> {
  const { data } = await API.get('/opportunities', { params });
  return {
    data: Array.isArray(data?.data) ? data.data : [],
    pagination: data?.pagination ?? {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };
}

export async function fetchOpportunity(id: string): Promise<Opportunity> {
  const { data } = await API.get(`/opportunities/${id}`);
  return (data?.data ?? data) as Opportunity;
}

export async function fetchOpportunityStats(): Promise<OpportunityStats> {
  const { data } = await API.get('/opportunities/dashboard/stats');
  return (
    data?.stats ?? {
      total: 0,
      prospecting: 0,
      proposal: 0,
      won: 0,
      lost: 0,
      revenue: 0,
    }
  );
}

/** Coerce the string form into the create/update payload (title + lead required). */
function toPayload(input: OpportunityInput) {
  return {
    title: input.title.trim(),
    lead: input.lead,
    value: Number(input.value) || 0,
    probability: Number(input.probability) || 0,
    stage: input.stage,
    expectedCloseDate: input.expectedCloseDate || undefined,
    notes: input.notes,
  };
}

export async function createOpportunity(input: OpportunityInput): Promise<Opportunity> {
  const { data } = await API.post('/opportunities', toPayload(input));
  return (data?.data ?? data) as Opportunity;
}

export async function updateOpportunity(
  id: string,
  input: OpportunityInput
): Promise<Opportunity> {
  const { data } = await API.put(`/opportunities/${id}`, toPayload(input));
  return (data?.data ?? data) as Opportunity;
}

export async function deleteOpportunity(id: string): Promise<void> {
  await API.delete(`/opportunities/${id}`);
}

export function toOpportunityInput(o: Opportunity): OpportunityInput {
  return {
    title: o.title ?? '',
    lead: typeof o.lead === 'object' && o.lead ? o.lead._id : (o.lead ?? ''),
    value: o.value !== undefined && o.value !== null ? String(o.value) : '',
    probability:
      o.probability !== undefined && o.probability !== null
        ? String(o.probability)
        : '',
    stage: (o.stage as Stage) || 'Prospecting',
    expectedCloseDate: o.expectedCloseDate
      ? new Date(o.expectedCloseDate).toISOString().split('T')[0]
      : '',
    notes: o.notes ?? '',
  };
}

/** Client-side validation (mirrors backend: title + lead required). */
export function validateOpportunity(input: OpportunityInput): string | null {
  if (!input.title.trim()) return 'Title is required';
  if (!input.lead) return 'Lead is required';
  return null;
}

export function leadName(lead: any): string {
  if (!lead) return 'No lead';
  if (typeof lead === 'string') return 'Lead';
  return lead.name || 'Lead';
}

/* ===================== Follow-ups =====================
 * Mirrors the web OpportunitiesTab follow-up panel, using the existing routes:
 *   GET    /opportunities/:id/followups              -> { success, data: FollowUp[] }
 *   POST   /opportunities/:id/followups              { type, date, note }  (date required)
 *   PUT    /opportunities/:id/followups/:followUpId  { status?, type?, date?, note? }
 *   DELETE /opportunities/:id/followups/:followUpId
 * The backend stamps completedAt when status becomes "Completed" and clears it otherwise.
 */

export const FOLLOW_UP_TYPES = ['Call', 'Meeting', 'Email', 'WhatsApp', 'Other'] as const;
export type FollowUpType = (typeof FOLLOW_UP_TYPES)[number];
export type FollowUpStatus = 'Pending' | 'Completed' | 'Cancelled';

export interface FollowUp {
  _id: string;
  type: FollowUpType;
  date: string;
  note?: string;
  status: FollowUpStatus;
  completedAt?: string;
  createdBy?: { _id?: string; name?: string } | string;
  createdAt?: string;
}

/** Form state — date as YYYY-MM-DD (DateField) plus optional HH:MM, like the web datetime-local input. */
export interface FollowUpInput {
  type: FollowUpType;
  date: string;
  time: string;
  note: string;
}

export const emptyFollowUp = (): FollowUpInput => ({ type: 'Call', date: '', time: '10:00', note: '' });

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function validateFollowUp(input: FollowUpInput): string | null {
  if (!input.date) return 'Follow-up date is required';
  if (input.time.trim() && !TIME_RE.test(input.time.trim())) return 'Enter time as HH:MM (24-hour)';
  if (input.note.length > 2000) return 'Note must be 2000 characters or fewer';
  return null;
}

/** Local date + time -> ISO string (web sends new Date(datetime-local)). */
function toIsoDate(input: FollowUpInput): string {
  const [y, m, d] = input.date.split('-').map(Number);
  const [hh, mm] = (input.time.trim() || '00:00').split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm).toISOString();
}

const pad = (n: number) => String(n).padStart(2, '0');

export function toFollowUpInput(f: FollowUp): FollowUpInput {
  const dt = new Date(f.date);
  return {
    type: f.type ?? 'Call',
    date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
    time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
    note: f.note ?? '',
  };
}

const followUpPayload = (input: FollowUpInput) => ({
  type: input.type,
  date: toIsoDate(input),
  note: input.note.trim(),
});

export async function fetchFollowUps(opportunityId: string): Promise<FollowUp[]> {
  const { data } = await API.get(`/opportunities/${opportunityId}/followups`);
  return Array.isArray(data?.data) ? (data.data as FollowUp[]) : [];
}

export async function addFollowUp(opportunityId: string, input: FollowUpInput): Promise<void> {
  await API.post(`/opportunities/${opportunityId}/followups`, followUpPayload(input));
}

export async function updateFollowUp(
  opportunityId: string,
  followUpId: string,
  patch: FollowUpInput | { status: FollowUpStatus }
): Promise<void> {
  const body = 'status' in patch ? patch : followUpPayload(patch);
  await API.put(`/opportunities/${opportunityId}/followups/${followUpId}`, body);
}

export async function deleteFollowUp(opportunityId: string, followUpId: string): Promise<void> {
  await API.delete(`/opportunities/${opportunityId}/followups/${followUpId}`);
}

/** Pending first (soonest due), then completed/cancelled (most recent first). */
export function sortFollowUps(rows: FollowUp[]): FollowUp[] {
  const t = (f: FollowUp) => new Date(f.date).getTime() || 0;
  return [...rows].sort((a, b) => {
    const ap = a.status === 'Pending', bp = b.status === 'Pending';
    if (ap !== bp) return ap ? -1 : 1;
    return ap ? t(a) - t(b) : t(b) - t(a);
  });
}

export const isOverdue = (f: FollowUp) =>
  f.status === 'Pending' && new Date(f.date).getTime() < Date.now();
