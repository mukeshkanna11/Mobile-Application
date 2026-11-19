import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import Toast from 'react-native-toast-message';

import SearchablePicker from '@/components/ui/SearchablePicker';
import Segmented from '@/components/ui/Segmented';
import {
  addConversationNote,
  convertConversationToLead,
  CONVERSATION_STATUSES,
  fetchAssignees,
  shortTime,
  updateConversation,
  type Assignee,
  type Conversation,
  type ConversationStatus,
} from '@/services/whatsapp';

const errText = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** Status, assignee, Convert to Lead and internal notes — same APIs as the web inbox. */
export default function ConversationDetails({
  conversation,
  onChange,
}: {
  conversation: Conversation;
  onChange: (c: Conversation) => void;
}) {
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    fetchAssignees().then(setAssignees).catch(() => setAssignees([]));
  }, []);

  const assigneeOpts = useMemo(
    () => [
      { label: 'Unassigned', value: '' },
      ...assignees.map((u) => ({ label: u.name || u.email || 'User', sublabel: u.email, value: u._id })),
    ],
    [assignees]
  );

  const act = async (key: string, fn: () => Promise<Conversation>, ok: string) => {
    try {
      setBusy(key);
      onChange(await fn());
      Toast.show({ type: 'success', text1: ok });
      return true;
    } catch (e) {
      Toast.show({ type: 'error', text1: errText(e, 'Action failed') });
      return false;
    } finally {
      setBusy('');
    }
  };

  const setStatus = (status: ConversationStatus) =>
    status !== conversation.status && act('status', () => updateConversation(conversation._id, { status }), `Marked ${status}`);

  const assign = (userId: string) =>
    act('assign', () => updateConversation(conversation._id, { assignedTo: userId || null }), userId ? 'Conversation assigned' : 'Unassigned');

  const convert = () =>
    Alert.alert('Convert to Lead', 'Create a lead from this conversation (or link an existing lead with the same contact)?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Convert', onPress: () => act('lead', () => convertConversationToLead(conversation._id), 'Lead linked') },
    ]);

  const saveNote = async () => {
    const body = note.trim();
    if (!body) return;
    if (await act('note', () => addConversationNote(conversation._id, body), 'Note added')) setNote('');
  };

  const notes = [...(conversation.notes ?? [])].reverse();

  return (
    <View className="gap-4 border-b border-slate-200 bg-white px-4 py-4">
      <Segmented
        label="Status"
        options={CONVERSATION_STATUSES}
        value={(conversation.status as ConversationStatus) || 'Open'}
        onChange={setStatus}
      />

      <SearchablePicker
        label="Assigned to"
        placeholder="Unassigned"
        value={conversation.assignedTo?._id || ''}
        options={assigneeOpts}
        onSelect={assign}
        searchPlaceholder="Search team members…"
      />

      {conversation.lead ? (
        <Pressable
          onPress={() => router.push({ pathname: '/lead/[id]', params: { id: conversation.lead!._id } })}
          className="flex-row items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5"
        >
          <Feather name="user-check" size={15} color="#059669" />
          <Text className="flex-1 text-sm text-emerald-800" numberOfLines={1}>
            Lead: {conversation.lead.name || 'Linked lead'}
          </Text>
          <Feather name="chevron-right" size={15} color="#059669" />
        </Pressable>
      ) : (
        <Pressable
          onPress={convert}
          disabled={!!busy}
          className="flex-row items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 active:bg-indigo-700"
        >
          {busy === 'lead' ? <ActivityIndicator color="#fff" /> : <Feather name="user-plus" size={15} color="#fff" />}
          <Text className="text-sm font-semibold text-white">Convert to Lead</Text>
        </Pressable>
      )}

      <View>
        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Internal notes ({notes.length})
        </Text>
        <View className="flex-row items-end gap-2">
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add a note (never sent to the customer)"
            placeholderTextColor="#94a3b8"
            maxLength={2000}
            multiline
            className="max-h-24 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
          />
          <Pressable
            onPress={saveNote}
            disabled={!note.trim() || !!busy}
            className={`h-10 w-10 items-center justify-center rounded-xl ${note.trim() ? 'bg-indigo-600' : 'bg-slate-300'}`}
          >
            {busy === 'note' ? <ActivityIndicator color="#fff" /> : <Feather name="plus" size={18} color="#fff" />}
          </Pressable>
        </View>
        {notes.map((n) => (
          <View key={n._id} className="mt-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
            <Text className="text-sm text-slate-800">{n.body}</Text>
            <Text className="mt-1 text-[11px] text-slate-500">
              {[n.authorName, shortTime(n.createdAt)].filter(Boolean).join(' · ')}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
