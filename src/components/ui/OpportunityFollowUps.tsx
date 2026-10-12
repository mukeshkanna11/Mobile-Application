import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import Badge from '@/components/ui/Badge';
import DateField from '@/components/ui/DateField';
import FormField from '@/components/ui/FormField';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Segmented from '@/components/ui/Segmented';
import {
  addFollowUp,
  deleteFollowUp,
  emptyFollowUp,
  fetchFollowUps,
  FOLLOW_UP_TYPES,
  isOverdue,
  sortFollowUps,
  toFollowUpInput,
  updateFollowUp,
  validateFollowUp,
  type FollowUp,
  type FollowUpInput,
  type FollowUpStatus,
} from '@/services/opportunities';

type FeatherName = keyof typeof Feather.glyphMap;

const TYPE_ICON: Record<string, FeatherName> = {
  Call: 'phone',
  Meeting: 'users',
  Email: 'mail',
  WhatsApp: 'message-circle',
  Other: 'bookmark',
};

const STATUS_BADGE: Record<FollowUpStatus | 'Overdue', { bg: string; text: string; dot: string }> = {
  Pending: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  Overdue: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  Completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  Cancelled: { bg: 'bg-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' },
};

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const errMsg = (err: any, fallback: string) => err?.response?.data?.message ?? fallback;

function ActionChip({
  icon,
  label,
  tone,
  onPress,
  disabled,
}: {
  icon: FeatherName;
  label: string;
  tone: 'indigo' | 'green' | 'red' | 'slate';
  onPress: () => void;
  disabled: boolean;
}) {
  const styles = {
    indigo: ['bg-indigo-50', 'text-indigo-600', '#4f46e5'],
    green: ['bg-emerald-50', 'text-emerald-700', '#059669'],
    red: ['bg-red-50', 'text-red-600', '#dc2626'],
    slate: ['bg-slate-100', 'text-slate-600', '#475569'],
  }[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      className={`flex-row items-center rounded-full px-2.5 py-1.5 active:opacity-80 ${styles[0]} ${disabled ? 'opacity-50' : ''}`}
    >
      <Feather name={icon} size={12} color={styles[2]} />
      <Text className={`ml-1 text-[11px] font-semibold ${styles[1]}`}>{label}</Text>
    </Pressable>
  );
}

/**
 * Opportunity follow-ups card (web OpportunitiesTab parity): list, add, edit,
 * complete / cancel / reopen, delete. Self-contained — loads its own data from
 * the follow-up endpoints so the detail screen only renders it.
 */
export default function OpportunityFollowUps({ opportunityId }: { opportunityId: string }) {
  const [rows, setRows] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // null = form closed; 'new' = adding; otherwise the follow-up id being edited.
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FollowUpInput>(emptyFollowUp);

  // One write at a time; the ref blocks double taps before re-render.
  const [busyId, setBusyId] = useState<string | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    fetchFollowUps(opportunityId)
      .then((data) => {
        setRows(sortFollowUps(data));
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [opportunityId, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  /** Run one mutation with the busy guard, toast, and reload on success. */
  const run = useCallback(
    async (key: string, action: () => Promise<void>, success: string, failure: string) => {
      if (busyRef.current) return false;
      busyRef.current = true;
      setBusyId(key);
      try {
        await action();
        Toast.show({ type: 'success', text1: success });
        setReloadKey((k) => k + 1);
        return true;
      } catch (err: any) {
        Toast.show({ type: 'error', text1: failure, text2: errMsg(err, 'Please try again.') });
        return false;
      } finally {
        busyRef.current = false;
        setBusyId(null);
      }
    },
    []
  );

  const openNew = () => {
    setForm(emptyFollowUp());
    setEditing('new');
  };
  const openEdit = (f: FollowUp) => {
    setForm(toFollowUpInput(f));
    setEditing(f._id);
  };
  const closeForm = () => setEditing(null);

  const save = async () => {
    const err = validateFollowUp(form);
    if (err) {
      Toast.show({ type: 'error', text1: err });
      return;
    }
    const isNew = editing === 'new';
    const ok = await run(
      'form',
      () => (isNew ? addFollowUp(opportunityId, form) : updateFollowUp(opportunityId, editing!, form)),
      isNew ? 'Follow-up added' : 'Follow-up updated',
      isNew ? 'Failed to add follow-up' : 'Failed to update follow-up'
    );
    if (ok) closeForm();
  };

  const setStatus = (f: FollowUp, status: FollowUpStatus) =>
    run(
      f._id,
      () => updateFollowUp(opportunityId, f._id, { status }),
      status === 'Completed' ? 'Follow-up completed' : status === 'Cancelled' ? 'Follow-up cancelled' : 'Follow-up reopened',
      'Failed to update follow-up'
    );

  const confirmDelete = (f: FollowUp) =>
    Alert.alert('Delete follow-up', `Delete this ${f.type.toLowerCase()} follow-up?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          run(f._id, () => deleteFollowUp(opportunityId, f._id), 'Follow-up deleted', 'Failed to delete follow-up');
          if (editing === f._id) closeForm();
        },
      },
    ]);

  const pending = rows.filter((r) => r.status === 'Pending').length;
  const busy = busyId !== null;

  return (
    <View className="mt-4 rounded-2xl border border-slate-100 bg-white px-4 pb-4 shadow-sm">
      <View className="flex-row items-center justify-between pt-4">
        <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Follow-ups{rows.length ? ` (${pending} pending)` : ''}
        </Text>
        {editing === null ? (
          <Pressable
            onPress={openNew}
            disabled={busy}
            hitSlop={8}
            className="flex-row items-center rounded-full bg-indigo-50 px-3 py-1.5 active:opacity-80"
          >
            <Feather name="plus" size={13} color="#4f46e5" />
            <Text className="ml-1 text-xs font-semibold text-indigo-600">Add</Text>
          </Pressable>
        ) : null}
      </View>

      {editing !== null ? (
        <View className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
          <Text className="mb-2 text-sm font-semibold text-slate-800">
            {editing === 'new' ? 'New follow-up' : 'Edit follow-up'}
          </Text>
          <Segmented
            label="Type"
            options={FOLLOW_UP_TYPES}
            value={form.type}
            onChange={(v) => setForm((f) => ({ ...f, type: v }))}
            scroll
          />
          <View className="flex-row gap-3">
            <View className="flex-[3]">
              <DateField label="Date *" value={form.date} onChange={(d) => setForm((f) => ({ ...f, date: d }))} />
            </View>
            <View className="flex-[2]">
              <FormField
                label="Time"
                value={form.time}
                onChangeText={(t) => setForm((f) => ({ ...f, time: t.replace(/[^0-9:]/g, '').slice(0, 5) }))}
                placeholder="HH:MM"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
          <FormField
            label="Note"
            value={form.note}
            onChangeText={(t) => setForm((f) => ({ ...f, note: t }))}
            placeholder="What needs to happen on this follow-up?"
            multiline
          />
          <PrimaryButton
            label={editing === 'new' ? 'Add Follow-up' : 'Save Changes'}
            loadingLabel="Saving…"
            loading={busyId === 'form'}
            disabled={busy}
            onPress={save}
          />
          <Pressable onPress={closeForm} disabled={busy} className="mt-2 items-center py-2">
            <Text className="text-sm font-medium text-slate-500">Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator className="py-6" color="#4f46e5" />
      ) : error ? (
        <View className="items-center py-5">
          <Text className="text-sm text-slate-500">Couldn&apos;t load follow-ups.</Text>
          <Pressable onPress={() => { setLoading(true); reload(); }} className="mt-2 px-3 py-1.5">
            <Text className="text-sm font-semibold text-indigo-600">Retry</Text>
          </Pressable>
        </View>
      ) : rows.length === 0 ? (
        <Text className="py-5 text-center text-sm text-slate-500">
          No follow-ups scheduled. Tap Add to plan the next step.
        </Text>
      ) : (
        rows.map((f, i) => {
          const badgeKey = isOverdue(f) ? 'Overdue' : f.status;
          const rowBusy = busyId === f._id;
          return (
            <View key={f._id} className={`py-3 ${i > 0 ? 'border-t border-slate-100' : 'mt-2'}`}>
              <View className="flex-row items-start">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-indigo-50">
                  <Feather name={TYPE_ICON[f.type] ?? 'bookmark'} size={16} color="#4f46e5" />
                </View>
                <View className="ml-3 min-w-0 flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-slate-900">{f.type}</Text>
                    {rowBusy ? (
                      <ActivityIndicator size="small" color="#4f46e5" />
                    ) : (
                      <Badge label={badgeKey} {...STATUS_BADGE[badgeKey]} />
                    )}
                  </View>
                  <Text className="mt-0.5 text-xs text-slate-500">{fmtDateTime(f.date)}</Text>
                  {f.note ? <Text className="mt-1 text-sm text-slate-700">{f.note}</Text> : null}
                  {f.status === 'Completed' && f.completedAt ? (
                    <Text className="mt-1 text-[11px] text-emerald-600">Completed {fmtDateTime(f.completedAt)}</Text>
                  ) : null}

                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {f.status === 'Pending' ? (
                      <>
                        <ActionChip icon="check" label="Complete" tone="green" disabled={busy} onPress={() => setStatus(f, 'Completed')} />
                        <ActionChip icon="x" label="Cancel" tone="slate" disabled={busy} onPress={() => setStatus(f, 'Cancelled')} />
                      </>
                    ) : (
                      <ActionChip icon="rotate-ccw" label="Reopen" tone="indigo" disabled={busy} onPress={() => setStatus(f, 'Pending')} />
                    )}
                    <ActionChip icon="edit-2" label="Edit" tone="indigo" disabled={busy} onPress={() => openEdit(f)} />
                    <ActionChip icon="trash-2" label="Delete" tone="red" disabled={busy} onPress={() => confirmDelete(f)} />
                  </View>
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
