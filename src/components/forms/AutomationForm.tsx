import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import FormField from '@/components/ui/FormField';
import PrimaryButton from '@/components/ui/PrimaryButton';
import SearchablePicker from '@/components/ui/SearchablePicker';
import Segmented from '@/components/ui/Segmented';
import {
  ACTION_TYPES,
  actionTypeMeta,
  automationError,
  CONDITION_OPERATORS,
  CRM_AUTOMATION_MODULES,
  emptyAction,
  emptyAutomation,
  emptyCondition,
  operatorNeedsValue,
  TRIGGER_EVENTS,
  validateAutomation,
  type ActionInput,
  type AutomationInput,
  type ConditionInput,
} from '@/services/automations';
import { isForbidden } from '@/services/products';
import { fetchUsers } from '@/services/users';

/** Segmented shows labels; these map label <-> backend value. */
const labelOf = (list: readonly { value: string; label: string }[], v: string) =>
  list.find((x) => x.value === v)?.label ?? list[0].label;
const valueOf = (list: readonly { value: string; label: string }[], l: string) =>
  list.find((x) => x.label === l)?.value ?? list[0].value;

const MODULE_OPTS = CRM_AUTOMATION_MODULES.map((m) => ({ value: m.module, label: m.module }));
const ACTION_OPTS = ACTION_TYPES.map((a) => ({ value: a.type, label: a.label }));

function SectionTitle({ children, step }: { children: string; step: number }) {
  return (
    <View className="mb-3 mt-4 flex-row items-center gap-2">
      <View className="h-5 w-5 items-center justify-center rounded-full bg-indigo-600">
        <Text className="text-[10px] font-bold text-white">{step}</Text>
      </View>
      <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</Text>
    </View>
  );
}

function CardHeader({ title, onRemove }: { title: string; onRemove?: () => void }) {
  return (
    <View className="mb-2 flex-row items-center justify-between">
      <Text className="text-sm font-semibold text-slate-700">{title}</Text>
      {onRemove ? (
        <Pressable hitSlop={10} onPress={onRemove}>
          <Feather name="trash-2" size={16} color="#dc2626" />
        </Pressable>
      ) : null}
    </View>
  );
}

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-2 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-300 bg-indigo-50 py-3"
    >
      <Feather name="plus" size={16} color="#4f46e5" />
      <Text className="text-sm font-medium text-indigo-600">{label}</Text>
    </Pressable>
  );
}

/**
 * Shared create/edit automation builder (web AutomationBuilder parity):
 * basics → trigger → conditions → actions, with backend-valid enums only.
 */
export default function AutomationForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: AutomationInput;
  submitLabel: string;
  onSubmit: (input: AutomationInput) => Promise<void>;
}) {
  const [form, setForm] = useState<AutomationInput>(initial ?? emptyAutomation());
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  // Users for "Assign Owner" — /admin/users is admin-only; fall back to an ID field.
  const [users, setUsers] = useState<{ label: string; sublabel?: string; value: string }[]>([]);
  const [usersForbidden, setUsersForbidden] = useState(false);
  const needsUsers = form.actions.some((a) => a.type === 'assignOwner');
  useEffect(() => {
    if (!needsUsers || users.length || usersForbidden) return;
    fetchUsers()
      .then((rows) => setUsers(rows.map((u) => ({ label: u.name || u.email || 'User', sublabel: u.email, value: u._id }))))
      .catch((err) => setUsersForbidden(isForbidden(err)));
  }, [needsUsers, users.length, usersForbidden]);

  const set = <K extends keyof AutomationInput>(k: K, v: AutomationInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setCondition = (i: number, patch: Partial<ConditionInput>) =>
    setForm((f) => ({ ...f, conditions: f.conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));
  const setAction = (i: number, patch: Partial<ActionInput>) =>
    setForm((f) => ({ ...f, actions: f.actions.map((a, j) => (j === i ? { ...a, ...patch } : a)) }));

  const eventLabels = useMemo(() => TRIGGER_EVENTS.map((e) => e.label), []);
  const operatorLabels = useMemo(() => CONDITION_OPERATORS.map((o) => o.label), []);

  const submit = async () => {
    if (savingRef.current) return;
    const err = validateAutomation(form);
    if (err) {
      Toast.show({ type: 'error', text1: err });
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Save failed', text2: automationError(e) });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SectionTitle step={1}>Basics</SectionTitle>
        <FormField label="Name" required value={form.name} onChangeText={(t) => set('name', t)} placeholder="New Lead Follow-up" />
        <FormField
          label="Description"
          value={form.description}
          onChangeText={(t) => set('description', t)}
          placeholder="What does this automation do?"
          multiline
        />
        <Segmented
          label="Module"
          options={MODULE_OPTS.map((m) => m.label)}
          value={form.module}
          onChange={(v) => set('module', v)}
          scroll
        />

        <SectionTitle step={2}>Trigger</SectionTitle>
        <Segmented
          label="When"
          options={eventLabels}
          value={labelOf(TRIGGER_EVENTS, form.event)}
          onChange={(l) => set('event', valueOf(TRIGGER_EVENTS, l))}
          scroll
        />
        {form.event === 'fieldChanged' ? (
          <FormField
            label="Field to watch"
            required
            value={form.triggerField}
            onChangeText={(t) => set('triggerField', t)}
            placeholder="e.g. priority"
            autoCapitalize="none"
          />
        ) : null}

        <SectionTitle step={3}>Conditions (optional)</SectionTitle>
        {form.conditions.length > 1 ? (
          <Segmented
            label="Match"
            options={['AND', 'OR'] as const}
            value={form.conditionLogic}
            onChange={(v) => set('conditionLogic', v)}
          />
        ) : null}
        {form.conditions.map((c, i) => (
          <View key={i} className="mb-3 rounded-2xl border border-slate-200 bg-white p-4">
            <CardHeader
              title={`Condition ${i + 1}`}
              onRemove={() => setForm((f) => ({ ...f, conditions: f.conditions.filter((_, j) => j !== i) }))}
            />
            <FormField
              label="Field"
              required
              value={c.field}
              onChangeText={(t) => setCondition(i, { field: t })}
              placeholder="e.g. source"
              autoCapitalize="none"
            />
            <Segmented
              label="Operator"
              options={operatorLabels}
              value={labelOf(CONDITION_OPERATORS, c.operator)}
              onChange={(l) => setCondition(i, { operator: valueOf(CONDITION_OPERATORS, l) })}
              scroll
            />
            {operatorNeedsValue(c.operator) ? (
              <FormField
                label="Value"
                required
                value={c.value}
                onChangeText={(t) => setCondition(i, { value: t })}
                placeholder="e.g. Website"
              />
            ) : null}
          </View>
        ))}
        <AddButton
          label="Add condition"
          onPress={() => setForm((f) => ({ ...f, conditions: [...f.conditions, emptyCondition()] }))}
        />

        <SectionTitle step={4}>Actions</SectionTitle>
        {form.actions.map((a, i) => {
          const meta = actionTypeMeta(a.type);
          return (
            <View key={i} className="mb-3 rounded-2xl border border-slate-200 bg-white p-4">
              <CardHeader
                title={`Action ${i + 1}`}
                onRemove={
                  form.actions.length > 1
                    ? () => setForm((f) => ({ ...f, actions: f.actions.filter((_, j) => j !== i) }))
                    : undefined
                }
              />
              <Segmented
                label="Do this"
                options={ACTION_OPTS.map((o) => o.label)}
                value={labelOf(ACTION_OPTS, a.type)}
                onChange={(l) => setAction(i, { type: valueOf(ACTION_OPTS, l), config: {} })}
                scroll
              />
              {meta?.fields.map((fld) =>
                fld.kind === 'user' && !usersForbidden ? (
                  <SearchablePicker
                    key={fld.key}
                    label={fld.label}
                    required={fld.required}
                    placeholder={users.length ? 'Select user' : 'Loading users…'}
                    searchPlaceholder="Search users…"
                    value={a.config[fld.key] ?? ''}
                    options={users}
                    onSelect={(v) => setAction(i, { config: { ...a.config, [fld.key]: v } })}
                  />
                ) : (
                  <FormField
                    key={fld.key}
                    label={fld.kind === 'user' ? `${fld.label} (user ID — listing users is admin-only)` : fld.label}
                    required={fld.required}
                    value={a.config[fld.key] ?? ''}
                    onChangeText={(t) =>
                      setAction(i, {
                        config: { ...a.config, [fld.key]: fld.kind === 'number' ? t.replace(/[^0-9]/g, '') : t },
                      })
                    }
                    placeholder={fld.placeholder}
                    multiline={fld.kind === 'multiline'}
                    keyboardType={fld.kind === 'number' ? 'number-pad' : fld.kind === 'email' ? 'email-address' : 'default'}
                    autoCapitalize={fld.kind === 'email' || fld.kind === 'user' ? 'none' : 'sentences'}
                  />
                )
              )}
            </View>
          );
        })}
        <AddButton
          label="Add action"
          onPress={() => setForm((f) => ({ ...f, actions: [...f.actions, emptyAction()] }))}
        />

        <Text className="mb-3 mt-2 text-xs leading-5 text-slate-500">
          New automations are saved as Draft. Activate them from the automation detail screen.
        </Text>
        <PrimaryButton label={submitLabel} loadingLabel="Saving…" loading={saving} onPress={submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
