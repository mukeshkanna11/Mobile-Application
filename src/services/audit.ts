import API from '@/services/api';

/**
 * Audit Logs data access — mirrors the web module (Frontend/src/pages/AuditLogs.jsx).
 *
 * The endpoint returns every log as a bare array, already sorted newest-first,
 * with `user` populated. Search / action filtering / pagination are all
 * client-side, exactly as on web.
 *
 *   GET /audit          -> AuditLog[]   (admin only)
 *   GET /audit/:userId  -> AuditLog[]   (admin only, not used by this screen)
 *
 * NOTE: the AuditLog schema has no `module`, `ip` or `severity` field. The web
 * table renders `log.module || "General"`, `log.ip || "--"` and
 * `log.severity || "Info"`, so those three columns are constants there. The
 * helpers below keep the same fallbacks but prefer `entity` for the module,
 * since that is the real field carrying the record's subject.
 */

/** Action buckets copied from the web `stats` useMemo. */
export const SECURITY_ACTIONS = ['LOGIN', 'LOGOUT', 'PASSWORD_CHANGE'];
export const CRITICAL_ACTIONS = ['DELETE', 'ROLE_CHANGE'];

/** Severity tokens copied from the web status-cell ternary. */
export const SEVERITY_STYLES: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700',
  High: 'bg-orange-100 text-orange-700',
  Medium: 'bg-yellow-100 text-yellow-700',
};

export const SEVERITY_FALLBACK = 'bg-emerald-100 text-emerald-700';

export function severityStyle(severity: string): string {
  return SEVERITY_STYLES[severity] ?? SEVERITY_FALLBACK;
}

export interface AuditUser {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface AuditLog {
  _id: string;
  user?: AuditUser | string | null;
  action: string;
  entity?: string;
  entityId?: string | null;
  description?: string;
  target?: string;
  meta?: unknown;
  createdAt?: string;
  updatedAt?: string;
  /** Rendered by the web table but absent from the schema. */
  module?: string;
  ip?: string;
  severity?: string;
}

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const data = (payload as { data?: unknown })?.data;
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const { data } = await API.get('/audit');
  return asArray<AuditLog>(data);
}

/* ================= FIELD HELPERS ================= */

function asUser(user: AuditLog['user']): AuditUser | null {
  return user && typeof user === 'object' ? user : null;
}

/** Web: `log.user?.name || "System"`. */
export function userName(log: AuditLog): string {
  return asUser(log.user)?.name || 'System';
}

export function userEmail(log: AuditLog): string {
  return asUser(log.user)?.email || '';
}

export function userInitial(log: AuditLog): string {
  return (asUser(log.user)?.name || 'S').charAt(0).toUpperCase();
}

/**
 * Web renders `log.description || "System Event"`. Descriptions are empty on
 * every current record, so fall back to `ACTION Entity` — real information
 * instead of the same placeholder on every row.
 */
export function eventTitle(log: AuditLog): string {
  if (log.description) return log.description;
  const entity = log.entity ? ` ${log.entity}` : '';
  return log.action ? `${log.action}${entity}` : 'System Event';
}

/** Web: `#${log._id.slice(-8)}`. */
export function shortId(log: AuditLog): string {
  return `#${(log._id ?? '').slice(-8)}`;
}

/** Web: `log.module || "General"` — `entity` preferred when module is absent. */
export function moduleOf(log: AuditLog): string {
  return log.module || log.entity || 'General';
}

/** Web: `log.ip || "--"`. */
export function ipOf(log: AuditLog): string {
  return log.ip || '—';
}

/** Web: `log.severity || "Info"`. */
export function severityOf(log: AuditLog): string {
  return log.severity || 'Info';
}

export function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export function formatTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString();
}

/* ================= FILTERS ================= */

export interface AuditFilters {
  search: string;
  action: 'ALL' | string;
}

/**
 * Action options built from the data, matching the web `uniqueActions` memo:
 * `["ALL", ...new Set(logs.map(l => l.action))]`.
 */
export function auditActions(logs: AuditLog[]): string[] {
  return [
    'ALL',
    ...Array.from(new Set(logs.map((l) => l.action).filter(Boolean))),
  ];
}

/**
 * Client-side search + action filter. Web searches only
 * `action + user.name`; this also covers the email, entity and description
 * the search field advertises.
 */
export function filterAuditLogs(
  logs: AuditLog[],
  f: AuditFilters
): AuditLog[] {
  const q = f.search.trim().toLowerCase();

  return logs.filter((log) => {
    const matchesSearch = q
      ? `${log.action ?? ''} ${userName(log)} ${userEmail(log)} ${
          log.entity ?? ''
        } ${log.description ?? ''}`
          .toLowerCase()
          .includes(q)
      : true;

    const matchesAction = f.action === 'ALL' || log.action === f.action;

    return matchesSearch && matchesAction;
  });
}

/** Identical formulas to the web `stats` useMemo. */
export function auditMetrics(logs: AuditLog[]) {
  return {
    total: logs.length,
    users: new Set(logs.map((l) => userEmail(l)).filter(Boolean)).size,
    security: logs.filter((l) => SECURITY_ACTIONS.includes(l.action)).length,
    critical: logs.filter((l) => CRITICAL_ACTIONS.includes(l.action)).length,
  };
}
