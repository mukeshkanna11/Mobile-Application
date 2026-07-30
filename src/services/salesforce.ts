import API from '@/services/api';
import type { Activity } from '@/services/dashboard';
import { fetchLeads, LEAD_STATUSES, type Lead } from '@/services/leads';
import {
  fetchOpportunities,
  FILTER_STAGES,
  type Opportunity,
} from '@/services/opportunities';

/**
 * Salesforce module data access — mirrors the web SalesforceDashboard.jsx.
 *
 * This is an aggregation layer only: it owns NO CRUD. Leads and Opportunities
 * come from the existing mobile services untouched, and activities are read
 * from the existing `GET /activities` endpoint. Every derived metric below uses
 * the same formula as the web dashboard.
 *
 *   GET /leads?limit=1000            (via services/leads)
 *   GET /opportunities?limit=1000    (via services/opportunities)
 *   GET /activities?limit=n          (read-only, paginated envelope)
 */

/**
 * Funnel + pipeline buckets. Re-exported from the existing modules rather than
 * redeclared — these already match the web dashboard's LEAD_STATUSES/OPP_STAGES.
 */
export { FILTER_STAGES as OPP_STAGES, LEAD_STATUSES };

/** Chart colours copied from the web STATUS_COLORS / STAGE_COLORS. */
export const STATUS_COLORS: Record<string, string> = {
  New: '#3b82f6',
  Contacted: '#f59e0b',
  Qualified: '#22c55e',
  Closed: '#64748b',
};

export const STAGE_COLORS = ['#6366f1', '#8b5cf6', '#22c55e', '#ef4444'];

export interface SalesforceSnapshot {
  leads: Lead[];
  opportunities: Opportunity[];
  activities: Activity[];
  /** True when every source failed — drives the dashboard's error state. */
  allFailed: boolean;
}

/**
 * Read-only activities fetch. Deliberately not a CRUD service: the Salesforce
 * module only reads the feed, it never creates or edits activities.
 */
export async function fetchActivities(limit = 50): Promise<Activity[]> {
  const { data } = await API.get('/activities', { params: { limit } });
  return Array.isArray(data?.data) ? (data.data as Activity[]) : [];
}

/**
 * Loads all three sources in parallel, tolerating a failed one — the same
 * `.catch(() => [])` per-call behaviour as the web dashboard's `load()`.
 */
export async function fetchSalesforceSnapshot(): Promise<SalesforceSnapshot> {
  const [leadsRes, oppsRes, actsRes] = await Promise.allSettled([
    fetchLeads(),
    // The web page relies on the endpoint default (page 1 only), which
    // under-counts. A high limit keeps the totals honest.
    fetchOpportunities({ limit: 1000 }),
    fetchActivities(),
  ]);

  return {
    leads: leadsRes.status === 'fulfilled' ? leadsRes.value : [],
    opportunities: oppsRes.status === 'fulfilled' ? oppsRes.value.data : [],
    activities: actsRes.status === 'fulfilled' ? actsRes.value : [],
    allFailed:
      leadsRes.status === 'rejected' &&
      oppsRes.status === 'rejected' &&
      actsRes.status === 'rejected',
  };
}

export interface SalesforceMetrics {
  totalLeads: number;
  qualifiedLeads: number;
  openOpps: number;
  pipelineValue: number;
  wonDeals: number;
  wonRevenue: number;
  winRate: number;
}

/** Identical formulas to the web `metrics` useMemo. */
export function salesforceMetrics(
  leads: Lead[],
  opportunities: Opportunity[]
): SalesforceMetrics {
  const openOpps = opportunities.filter(
    (o) => o.stage !== 'Closed Won' && o.stage !== 'Closed Lost'
  );
  const won = opportunities.filter((o) => o.stage === 'Closed Won');
  const lost = opportunities.filter((o) => o.stage === 'Closed Lost');

  const pipelineValue = openOpps.reduce((s, o) => s + (o.value || 0), 0);
  const wonRevenue = won.reduce((s, o) => s + (o.value || 0), 0);
  const closedCount = won.length + lost.length;
  const winRate = closedCount
    ? Math.round((won.length / closedCount) * 100)
    : 0;

  return {
    totalLeads: leads.length,
    qualifiedLeads: leads.filter((l) => l.status === 'Qualified').length,
    openOpps: openOpps.length,
    pipelineValue,
    wonDeals: won.length,
    wonRevenue,
    winRate,
  };
}

export interface Slice {
  name: string;
  value: number;
}

/** Lead count per status, empty buckets dropped (matches web leadStatusData). */
export function leadStatusBreakdown(leads: Lead[]): Slice[] {
  return LEAD_STATUSES.map((status) => ({
    name: status as string,
    value: leads.filter((l) => l.status === status).length,
  })).filter((d) => d.value > 0);
}

/** Deal value per stage, all buckets kept (matches web stageData). */
export function stageBreakdown(opportunities: Opportunity[]): Slice[] {
  return FILTER_STAGES.map((stage) => ({
    name: stage as string,
    value: opportunities
      .filter((o) => o.stage === stage)
      .reduce((s, o) => s + (o.value || 0), 0),
  }));
}

export interface FeedItem {
  id: string;
  title: string;
  desc: string;
  time?: string;
}

const byDateDesc = (a: { createdAt?: string }, b: { createdAt?: string }) =>
  new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();

/**
 * Six most recent activities, falling back to the newest leads when there are
 * no activities — the same graceful fallback as the web recentActivities memo.
 */
export function recentActivityFeed(
  activities: Activity[],
  leads: Lead[]
): FeedItem[] {
  if (activities.length) {
    return activities
      .slice()
      .sort(byDateDesc)
      .slice(0, 6)
      .map((a) => ({
        id: a._id,
        title: a.type || 'Activity',
        desc: a.notes || 'No notes',
        time: a.createdAt,
      }));
  }

  return leads
    .slice()
    .sort(byDateDesc)
    .slice(0, 6)
    .map((l) => ({
      id: l._id,
      title: 'New Lead',
      desc: `${l.name || 'Unknown'}${l.source ? ` · ${l.source}` : ''}`,
      time: l.createdAt,
    }));
}
