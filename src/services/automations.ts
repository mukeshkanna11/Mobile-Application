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

/* ================= Automation Builder =================
 * Mirrors web pages/Automation/AutomationBuilder.jsx against the existing backend:
 *   POST /automations      { name, description, module, trigger, conditionLogic, conditions, actions } -> 201 { automation }
 *   PUT  /automations/:id  same fields                                                              -> { automation }
 *   POST /automations/:id/test { record? } -> { result: { matched, executed } }
 * Backend requires name, module, trigger.event and ≥1 action; new automations start as "draft".
 * Note: /test fires the module+event for ALL *active* automations (real actions run).
 */

export const TRIGGER_EVENTS = [
  { value: 'created', label: 'Record Created' },
  { value: 'updated', label: 'Record Updated' },
  { value: 'deleted', label: 'Record Deleted' },
  { value: 'statusChanged', label: 'Status Changed' },
  { value: 'stageChanged', label: 'Stage Changed' },
  { value: 'fieldChanged', label: 'Field Changed' },
] as const;

/** Web OPERATORS list (subset of the backend enum the builder exposes). */
export const CONDITION_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Does not equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'notContains', label: 'Does not contain' },
  { value: 'greaterThan', label: 'Greater than' },
  { value: 'greaterThanOrEqual', label: 'Greater than or equal' },
  { value: 'lessThan', label: 'Less than' },
  { value: 'lessThanOrEqual', label: 'Less than or equal' },
  { value: 'exists', label: 'Exists' },
  { value: 'notExists', label: 'Does not exist' },
] as const;

const NO_VALUE_OPERATORS = ['exists', 'notExists'];
export const operatorNeedsValue = (op: string) => !NO_VALUE_OPERATORS.includes(op);

export interface ActionField {
  key: string;
  label: string;
  required?: boolean;
  kind?: 'text' | 'multiline' | 'number' | 'email' | 'user';
  placeholder?: string;
}

/** Web ACTIONS list; config keys are the ones the backend actionExecutor reads. */
export const ACTION_TYPES: { type: string; label: string; icon: FeatherName; fields: ActionField[] }[] = [
  { type: 'sendNotification', label: 'Send Notification', icon: 'bell', fields: [
    { key: 'message', label: 'Message', required: true, kind: 'multiline', placeholder: 'Notify the team…' },
  ] },
  { type: 'createTask', label: 'Create Task', icon: 'clipboard', fields: [
    { key: 'title', label: 'Task title', required: true, placeholder: 'Follow up' },
    { key: 'dueInDays', label: 'Due in (days)', kind: 'number', placeholder: '0' },
  ] },
  { type: 'sendEmail', label: 'Send Email', icon: 'mail', fields: [
    { key: 'to', label: 'To (email)', required: true, kind: 'email', placeholder: 'name@company.com' },
    { key: 'subject', label: 'Subject', required: true, placeholder: 'Subject line' },
  ] },
  { type: 'assignOwner', label: 'Assign Owner', icon: 'user-check', fields: [
    { key: 'userId', label: 'Assign to', required: true, kind: 'user' },
  ] },
  { type: 'changeStatus', label: 'Change Status', icon: 'git-branch', fields: [
    { key: 'status', label: 'New status', required: true, placeholder: 'e.g. Contacted' },
  ] },
  { type: 'updateField', label: 'Update Field', icon: 'edit-3', fields: [
    { key: 'field', label: 'Field', required: true, placeholder: 'e.g. priority' },
    { key: 'value', label: 'Value', required: true, placeholder: 'e.g. High' },
  ] },
];

export const actionTypeMeta = (type: string) => ACTION_TYPES.find((a) => a.type === type);

export interface ConditionInput {
  field: string;
  operator: string;
  value: string;
}

export interface ActionInput {
  type: string;
  config: Record<string, string>;
}

export interface AutomationInput {
  name: string;
  description: string;
  module: string;
  event: string;
  /** Only for the "fieldChanged" event. */
  triggerField: string;
  conditionLogic: 'AND' | 'OR';
  conditions: ConditionInput[];
  actions: ActionInput[];
}

export const emptyCondition = (): ConditionInput => ({ field: '', operator: 'equals', value: '' });
export const emptyAction = (type = 'sendNotification'): ActionInput => ({ type, config: {} });

export const emptyAutomation = (module = 'Lead'): AutomationInput => ({
  name: '',
  description: '',
  module,
  event: 'created',
  triggerField: '',
  conditionLogic: 'AND',
  conditions: [],
  actions: [emptyAction()],
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Web validateStep rules + backend requirements, as one message. */
export function validateAutomation(f: AutomationInput): string | null {
  if (!f.name.trim()) return 'Name is required';
  if (!f.module) return 'Module is required';
  if (!f.event) return 'Trigger event is required';
  if (f.event === 'fieldChanged' && !f.triggerField.trim()) return 'Enter the field to watch';
  for (const [i, c] of f.conditions.entries()) {
    if (!c.field.trim()) return `Condition ${i + 1}: field is required`;
    if (operatorNeedsValue(c.operator) && c.value.trim() === '') return `Condition ${i + 1}: value is required`;
  }
  if (!f.actions.length) return 'At least one action is required';
  for (const [i, a] of f.actions.entries()) {
    const meta = actionTypeMeta(a.type);
    if (!meta) return `Action ${i + 1}: choose an action type`;
    for (const fld of meta.fields) {
      const v = (a.config[fld.key] ?? '').trim();
      if (fld.required && !v) return `Action ${i + 1}: ${fld.label} is required`;
      if (fld.kind === 'email' && v && !EMAIL_RE.test(v)) return `Action ${i + 1}: enter a valid email`;
    }
  }
  return null;
}

function toPayload(f: AutomationInput) {
  return {
    name: f.name.trim(),
    description: f.description.trim(),
    module: f.module,
    trigger: {
      type: 'event',
      event: f.event,
      ...(f.event === 'fieldChanged' ? { field: f.triggerField.trim() } : {}),
    },
    conditionLogic: f.conditionLogic,
    conditions: f.conditions.map((c) => ({
      field: c.field.trim(),
      operator: c.operator,
      value: operatorNeedsValue(c.operator) ? c.value.trim() : null,
    })),
    actions: f.actions.map((a, i) => {
      const meta = actionTypeMeta(a.type);
      const config: Record<string, string | number> = {};
      meta?.fields.forEach((fld) => {
        const v = (a.config[fld.key] ?? '').trim();
        if (!v) return;
        config[fld.key] = fld.kind === 'number' ? Number(v) || 0 : v;
      });
      return { type: a.type, config, order: i + 1 };
    }),
  };
}

export function toAutomationInput(a: Automation): AutomationInput {
  const t = (a.trigger ?? {}) as { event?: string; field?: string | null };
  return {
    name: a.name ?? '',
    description: a.description ?? '',
    module: a.module,
    event: t.event ?? 'created',
    triggerField: t.field ?? '',
    conditionLogic: a.conditionLogic === 'OR' ? 'OR' : 'AND',
    conditions: (a.conditions ?? []).map((c) => ({
      field: c.field ?? '',
      operator: c.operator ?? 'equals',
      value: c.value == null ? '' : String(c.value),
    })),
    actions: (a.actions ?? []).map((x) => ({
      type: x.type,
      config: Object.fromEntries(Object.entries(x.config ?? {}).map(([k, v]) => [k, v == null ? '' : String(v)])),
    })),
  };
}

export async function createAutomation(f: AutomationInput): Promise<Automation> {
  const { data } = await API.post('/automations', toPayload(f));
  return data?.automation as Automation;
}

export async function updateAutomation(id: string, f: AutomationInput): Promise<Automation> {
  const { data } = await API.put(`/automations/${id}`, toPayload(f));
  return data?.automation as Automation;
}

export async function testAutomation(id: string): Promise<{ matched: number; executed: number; error?: string }> {
  const { data } = await API.post(`/automations/${id}/test`, { record: {} });
  return data?.result ?? { matched: 0, executed: 0 };
}

/**
 * Templates — the web AutomationTemplates.jsx cards for CRM modules, turned into
 * real builder presets. Steps the backend cannot execute (e.g. "Create Client" →
 * createRecord has no executor) are omitted; user-specific values (assignee,
 * recipient) are left blank for the user to fill in.
 */
export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  icon: FeatherName;
  preset: AutomationInput;
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: 'lead-follow-up',
    name: 'New Lead Follow-up',
    description: 'Assign a new lead, send a welcome email, and create a follow-up task.',
    icon: 'users',
    preset: {
      ...emptyAutomation('Lead'),
      name: 'New Lead Follow-up',
      description: 'Assign, welcome and schedule a follow-up for every new lead.',
      actions: [
        { type: 'assignOwner', config: {} },
        { type: 'sendEmail', config: { subject: 'Thanks for your interest' } },
        { type: 'createTask', config: { title: 'Follow up with new lead', dueInDays: '1' } },
      ],
    },
  },
  {
    id: 'lead-score',
    name: 'Lead Score & Assignment',
    description: 'Prioritise leads from a chosen source and assign them to sales.',
    icon: 'trending-up',
    preset: {
      ...emptyAutomation('Lead'),
      name: 'Lead Score & Assignment',
      conditions: [{ field: 'source', operator: 'equals', value: 'Website' }],
      actions: [
        { type: 'updateField', config: { field: 'priority', value: 'High' } },
        { type: 'assignOwner', config: {} },
      ],
    },
  },
  {
    id: 'deal-won',
    name: 'Deal Won → Onboarding',
    description: 'When an opportunity is won, create onboarding tasks and email the customer.',
    icon: 'award',
    preset: {
      ...emptyAutomation('Opportunity'),
      name: 'Deal Won → Onboarding',
      event: 'stageChanged',
      conditions: [{ field: 'stage', operator: 'equals', value: 'Closed Won' }],
      actions: [
        { type: 'createTask', config: { title: 'Start client onboarding', dueInDays: '1' } },
        { type: 'sendEmail', config: { subject: 'Welcome aboard' } },
      ],
    },
  },
  {
    id: 'client-welcome',
    name: 'New Client Welcome',
    description: 'Send a welcome email, create an onboarding task and notify the team.',
    icon: 'briefcase',
    preset: {
      ...emptyAutomation('Client'),
      name: 'New Client Welcome',
      actions: [
        { type: 'sendEmail', config: { subject: 'Welcome to ReadyTech' } },
        { type: 'createTask', config: { title: 'Client onboarding checklist', dueInDays: '2' } },
        { type: 'sendNotification', config: { message: 'A new client has been added.' } },
      ],
    },
  },
  {
    id: 'invoice-created',
    name: 'Invoice Created Notification',
    description: 'Email the customer as soon as an invoice is created.',
    icon: 'file-text',
    preset: {
      ...emptyAutomation('Invoice'),
      name: 'Invoice Created Notification',
      actions: [{ type: 'sendEmail', config: { subject: 'Your invoice is ready' } }],
    },
  },
];
