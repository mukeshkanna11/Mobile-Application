import type { Feather } from '@expo/vector-icons';

import API from '@/services/api';

/**
 * CRM Automations — reuses the existing backend automation API, exactly as the
 * web Automations / AutomationDetails pages do (auth required on every route):
 *   GET    /automations?module=&status=&search=&limit=  -> { automations, pagination }
 *   GET    /automations/:id                             -> { automation }
 *   GET    /automations/:id/executions                  -> { executions }
 *   POST   /automations/:id/activate | /pause | /duplicate
 *   DELETE /automations/:id
 */

type FeatherName = keyof typeof Feather.glyphMap;

/** CRM modules the web Automations page labels (moduleMeta); ERP modules excluded. */
export const CRM_AUTOMATION_MODULES: {
  module: string;
  label: string;
  description: string;
  icon: FeatherName;
  color: string;
  tint: string;
}[] = [
  {
    module: 'Lead',
    label: 'Lead Automations',
    description: 'Workflows triggered by lead creation, status and follow-up events',
    icon: 'zap',
    color: '#4f46e5',
    tint: 'bg-indigo-50',
  },
  {
    module: 'Contact',
    label: 'Contact Automations',
    description: 'Workflows for contact records and communication events',
    icon: 'activity',
    color: '#0891b2',
    tint: 'bg-cyan-50',
  },
  {
    module: 'Client',
    label: 'Client Automations',
    description: 'Onboarding, status changes and account follow-ups for clients',
    icon: 'check-circle',
    color: '#059669',
    tint: 'bg-emerald-50',
  },
  {
    module: 'Opportunity',
    label: 'Opportunity Automations',
    description: 'Pipeline stage changes, deal assignment and win/loss workflows',
    icon: 'git-branch',
    color: '#7c3aed',
    tint: 'bg-violet-50',
  },
  {
    module: 'Invoice',
    label: 'Invoice Automations',
    description: 'Payment reminders and invoice status workflows',
    icon: 'clock',
    color: '#d97706',
    tint: 'bg-amber-50',
  },
];

export const crmModuleMeta = (module?: string) => CRM_AUTOMATION_MODULES.find((m) => m.module === module);

export type AutomationStatus = 'active' | 'paused' | 'draft';

/** Web statusMeta colours. */
export const STATUS_META: Record<string, { label: string; badge: string; text: string; dot: string }> = {
  active: { label: 'Active', badge: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  paused: { label: 'Paused', badge: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  draft: { label: 'Draft', badge: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
};

export interface AutomationAction {
  type: string;
  config?: Record<string, any>;
}

export interface Automation {
  _id: string;
  name: string;
  description?: string;
  module: string;
  status: AutomationStatus;
  trigger?: { type?: string; event?: string };
  conditions?: { field?: string; operator?: string; value?: unknown }[];
  conditionLogic?: string;
  actions?: AutomationAction[];
  executionCount?: number;
  successCount?: number;
  failureCount?: number;
  lastExecutedAt?: string | null;
  version?: number;
  createdBy?: { name?: string } | null;
  createdAt?: string;
}

export interface AutomationExecution {
  _id: string;
  status: string;
  createdAt?: string;
  error?: string;
}

export async function fetchAutomations(params: {
  module: string;
  status?: string;
  search?: string;
}): Promise<Automation[]> {
  const query: Record<string, string | number> = { module: params.module, limit: 100 };
  if (params.status && params.status !== 'all') query.status = params.status;
  if (params.search?.trim()) query.search = params.search.trim();
  const { data } = await API.get('/automations', { params: query });
  return data?.automations ?? [];
}

export async function fetchAutomation(id: string): Promise<Automation | null> {
  const { data } = await API.get(`/automations/${id}`);
  return data?.automation ?? null;
}

export async function fetchAutomationExecutions(id: string): Promise<AutomationExecution[]> {
  const { data } = await API.get(`/automations/${id}/executions`);
  return data?.executions ?? [];
}

export const activateAutomation = (id: string) => API.post(`/automations/${id}/activate`);
export const pauseAutomation = (id: string) => API.post(`/automations/${id}/pause`);
export const duplicateAutomation = (id: string) => API.post(`/automations/${id}/duplicate`);
export const deleteAutomation = (id: string) => API.delete(`/automations/${id}`);

/** Same message precedence as the web automationService handleError. */
export const automationError = (err: any) =>
  err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Something went wrong';

/** Web getActionSummary(). */
export function actionSummary(action: AutomationAction): string {
  const c = action.config ?? {};
  switch (action.type) {
    case 'sendNotification':
      return c.message || 'Notification';
    case 'createTask':
      return c.title || 'Create task';
    case 'sendEmail':
      return c.subject || 'Send email';
    case 'changeStatus':
      return `Change status to ${c.status || '-'}`;
    case 'assignOwner':
      return `Assign to ${c.userId || '-'}`;
    case 'updateField':
      return `Update ${c.field || '-'}`;
    default:
      return 'Automation action';
  }
}

/** Web formatRelativeDate(). */
export function relativeDate(date?: string | null): string {
  if (!date) return 'Never';
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return 'Never';
  const minutes = Math.floor((Date.now() - value.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return value.toLocaleDateString();
}
