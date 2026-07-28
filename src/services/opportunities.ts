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
