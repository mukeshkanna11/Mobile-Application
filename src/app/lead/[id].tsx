import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { DetailRow, Section } from '@/components/ui/DetailSection';
import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import PriorityChip from '@/components/ui/PriorityChip';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  deleteLead,
  fetchLead,
  isValidLeadPhone,
  priorityOf,
  sendLeadMessage,
  type Lead,
  type LeadMessageChannel,
} from '@/services/leads';
import {
  startLeadCall,
  type ActiveCall,
  type CallState,
} from '@/services/voice';

type FeatherName = keyof typeof Feather.glyphMap;

const CHANNEL_LABEL: Record<LeadMessageChannel, string> = {
  sms: 'SMS',
  whatsapp: 'WhatsApp',
};

const CALL_LABEL: Record<CallState, string> = {
  idle: '',
  connecting: 'Calling…',
  ringing: 'Ringing…',
  connected: 'Connected',
  completed: 'Call ended',
  failed: 'Call failed',
};

/** Compact action pill for the dark header (SMS / WhatsApp / Call). */
function CommAction({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: FeatherName;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 py-2.5 ${
        disabled ? 'opacity-40' : 'active:bg-white/20'
      }`}
    >
      <Feather name={icon} size={15} color="#ffffff" />
      <Text className="text-xs font-semibold text-white">{label}</Text>
    </Pressable>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <Text className="text-xs text-slate-500">{label}</Text>
      <Text className="mt-1 text-lg font-bold text-slate-900" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function LeadDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Communications: SMS / WhatsApp composer + Twilio Voice call
  const [channel, setChannel] = useState<LeadMessageChannel | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; text: string } | null>(null);

  const [callState, setCallState] = useState<CallState>('idle');
  const [callError, setCallError] = useState('');
  const callRef = useRef<ActiveCall | null>(null);

  // Hang up if the screen unmounts mid-call.
  useEffect(() => () => callRef.current?.hangup(), []);

  const openComposer = (c: LeadMessageChannel) => {
    setChannel(c);
    setDraft('');
    setSendResult(null);
  };

  const closeComposer = () => {
    if (sending) return;
    setChannel(null);
    setSendResult(null);
  };

  const sendMessage = async () => {
    if (!lead || !channel || sending) return;
    const message = draft.trim();
    if (!message) {
      Toast.show({ type: 'error', text1: 'Message is required' });
      return;
    }
    try {
      setSending(true);
      setSendResult(null);
      const res = await sendLeadMessage(lead._id, channel, message);
      const text = `${res.message || `${CHANNEL_LABEL[channel]} sent`}${
        res.data?.status ? ` (status: ${res.data.status})` : ''
      }`;
      setSendResult({ ok: true, text });
      setDraft('');
      Toast.show({ type: 'success', text1: res.message || `${CHANNEL_LABEL[channel]} sent` });
    } catch (err: any) {
      const text = err?.response
        ? (err.response.data?.message ?? `HTTP ${err.response.status}`)
        : `Network error: ${err?.message ?? 'request failed'}`;
      setSendResult({ ok: false, text });
      Toast.show({ type: 'error', text1: `${CHANNEL_LABEL[channel]} failed`, text2: text });
    } finally {
      setSending(false);
    }
  };

  const callActive =
    callState === 'connecting' || callState === 'ringing' || callState === 'connected';

  const startCall = async () => {
    if (!lead || callActive) return;
    setCallError('');
    callRef.current = await startLeadCall(lead, {
      onState: setCallState,
      onError: setCallError,
    });
  };

  const endCall = () => {
    callRef.current?.hangup();
    callRef.current = null;
    setCallState('idle');
    setCallError('');
  };

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(false);
      setLoading(true);
      setLead(await fetchLead(id));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const confirmDelete = useCallback(() => {
    if (!id) return;
    Alert.alert('Delete lead', `Delete “${lead?.name ?? 'this lead'}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            await deleteLead(id);
            Toast.show({ type: 'success', text1: 'Lead deleted' });
            router.back();
          } catch (err: any) {
            setDeleting(false);
            Toast.show({
              type: 'error',
              text1: 'Delete failed',
              text2: err?.response?.data?.message ?? 'Please try again.',
            });
          }
        },
      },
    ]);
  }, [id, lead]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        title="Lead Profile"
        badge="ReadyTech Solutions"
        right={
          lead ? (
            <>
              <HeaderAction
                icon="edit-2"
                onPress={() =>
                  router.push({
                    pathname: '/lead/edit/[id]',
                    params: { id: lead._id },
                  })
                }
              />
              <HeaderAction
                icon="trash-2"
                color="#fecaca"
                disabled={deleting}
                onPress={confirmDelete}
              />
            </>
          ) : undefined
        }
      >
        {lead ? (
          <View className="mt-4 flex-row items-center gap-4">
            <View className="h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10">
              <Text className="text-2xl font-black text-white">
                {(lead.name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-white" numberOfLines={1}>
                {lead.name}
              </Text>
              <Text className="text-xs text-slate-300" numberOfLines={1}>
                {lead.designation || 'Lead'}
                {lead.company ? ` · ${lead.company}` : ''}
              </Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                <View className="rounded-full bg-white/10 px-2.5 py-1">
                  <Text className="text-xs font-medium text-white">
                    {lead.status}
                  </Text>
                </View>
                <View className="rounded-full bg-indigo-500/20 px-2.5 py-1">
                  <Text className="text-xs font-medium text-indigo-100">
                    {lead.source || 'Website'}
                  </Text>
                </View>
                <View className="rounded-full bg-white/10 px-2.5 py-1">
                  <Text className="text-xs font-medium text-white">
                    RTS-{lead._id?.slice(-6)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {lead ? (
          <View className="mt-4 flex-row gap-2">
            <CommAction
              icon="message-square"
              label="SMS"
              disabled={!isValidLeadPhone(lead.phone)}
              onPress={() => openComposer('sms')}
            />
            <CommAction
              icon="message-circle"
              label="WhatsApp"
              disabled={!isValidLeadPhone(lead.phone)}
              onPress={() => openComposer('whatsapp')}
            />
            <CommAction
              icon="phone-call"
              label={callActive ? CALL_LABEL[callState] : 'Call'}
              disabled={!isValidLeadPhone(lead.phone) || callActive}
              onPress={startCall}
            />
          </View>
        ) : null}
      </EnterpriseHeader>

      {/* SMS / WhatsApp composer */}
      <Modal
        visible={!!channel && !!lead}
        transparent
        animationType="slide"
        onRequestClose={closeComposer}
      >
        <KeyboardAvoidingView
          className="flex-1 justify-end bg-black/50"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="rounded-t-3xl bg-slate-900 p-5 pb-8">
            <View className="mb-4 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-lg font-bold text-white">
                  Send {channel ? CHANNEL_LABEL[channel] : ''}
                </Text>
                <Text className="text-xs text-slate-400" numberOfLines={1}>
                  {lead?.name} · {lead?.phone}
                </Text>
              </View>
              <Pressable
                onPress={closeComposer}
                disabled={sending}
                className="h-9 w-9 items-center justify-center rounded-full bg-white/10"
              >
                <Feather name="x" size={18} color="#ffffff" />
              </Pressable>
            </View>

            <TextInput
              value={draft}
              onChangeText={setDraft}
              editable={!sending}
              multiline
              placeholder="Type your message…"
              placeholderTextColor="#64748b"
              textAlignVertical="top"
              className="min-h-[120px] rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white"
            />

            <Text className="mt-2 text-xs text-slate-500">
              Sent via Twilio · logged to lead activity
            </Text>

            {sendResult ? (
              <View
                className={`mt-3 flex-row items-start gap-2 rounded-xl p-3 ${
                  sendResult.ok ? 'bg-emerald-500/15' : 'bg-rose-500/15'
                }`}
              >
                <Feather
                  name={sendResult.ok ? 'check-circle' : 'alert-triangle'}
                  size={16}
                  color={sendResult.ok ? '#34d399' : '#fb7185'}
                />
                <Text
                  className={`flex-1 text-sm ${
                    sendResult.ok ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {sendResult.text}
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={sendMessage}
              disabled={sending}
              className={`mt-4 flex-row items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 ${
                sending ? 'opacity-60' : 'active:bg-indigo-700'
              }`}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Feather name="send" size={16} color="#ffffff" />
              )}
              <Text className="font-semibold text-white">
                {sending ? 'Sending…' : 'Send'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Twilio Voice call status */}
      <Modal
        visible={callState !== 'idle'}
        transparent
        animationType="fade"
        onRequestClose={() => (callActive ? undefined : endCall())}
      >
        <View className="flex-1 items-center justify-center bg-black/60 p-6">
          <View className="w-full max-w-sm items-center rounded-3xl bg-slate-900 p-6">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15">
              <Feather
                name={callState === 'failed' ? 'phone-off' : 'phone-call'}
                size={26}
                color={callState === 'failed' ? '#fb7185' : '#34d399'}
              />
            </View>
            <Text className="text-lg font-bold text-white">{lead?.name}</Text>
            <Text className="mt-1 text-sm text-slate-400">{lead?.phone}</Text>
            <View className="mt-4 flex-row items-center gap-2">
              {callState === 'connecting' || callState === 'ringing' ? (
                <ActivityIndicator size="small" color="#94a3b8" />
              ) : null}
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {CALL_LABEL[callState]}
              </Text>
            </View>
            {callError ? (
              <Text className="mt-3 text-center text-sm text-rose-300">{callError}</Text>
            ) : null}
            <Pressable
              onPress={endCall}
              className={`mt-6 w-full flex-row items-center justify-center gap-2 rounded-2xl py-3.5 ${
                callActive ? 'bg-rose-600 active:bg-rose-700' : 'bg-white/10 active:bg-white/20'
              }`}
            >
              <Feather name={callActive ? 'phone-off' : 'x'} size={16} color="#ffffff" />
              <Text className="font-semibold text-white">
                {callActive ? 'Hang up' : 'Close'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {loading ? (
        <LoadingState label="Loading lead…" />
      ) : error || !lead ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load lead"
          message="This lead may have been removed."
          actionLabel="Retry"
          onAction={load}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick stats (mirrors web) */}
          <View className="flex-row gap-3">
            <StatChip label="Lead Score" value={String(lead.leadScore ?? 82)} />
            <StatChip
              label="Expected Deal"
              value={`₹${lead.expectedValue ?? 0}`}
            />
            <StatChip
              label="Follow-up"
              value={lead.followUpDate || 'Not set'}
            />
          </View>

          <View className="mt-4 flex-row items-center gap-2">
            <Text className="text-xs text-slate-500">Derived priority:</Text>
            <PriorityChip priority={priorityOf(lead.status)} />
          </View>

          <Section title="Contact Information">
            <DetailRow
              icon="mail"
              label="Email"
              value={lead.email}
              onPress={
                lead.email
                  ? () => Linking.openURL(`mailto:${lead.email}`)
                  : undefined
              }
            />
            <DetailRow
              icon="phone"
              label="Phone"
              value={lead.phone}
              onPress={
                lead.phone
                  ? () => Linking.openURL(`tel:${lead.phone}`)
                  : undefined
              }
            />
            <DetailRow icon="briefcase" label="Company" value={lead.company} />
            <DetailRow
              icon="globe"
              label="Website"
              value={lead.website}
              onPress={
                lead.website
                  ? () =>
                      Linking.openURL(
                        lead.website!.startsWith('http')
                          ? lead.website!
                          : `https://${lead.website}`
                      )
                  : undefined
              }
            />
            <DetailRow icon="layers" label="Industry" value={lead.industry} />
            <DetailRow
              icon="calendar"
              label="Created"
              value={
                lead.createdAt
                  ? new Date(lead.createdAt).toLocaleString()
                  : undefined
              }
            />
          </Section>

          <Section title="Sales Information">
            <DetailRow icon="target" label="Lead Status" value={lead.status} />
            <DetailRow
              icon="flag"
              label="Priority"
              value={lead.priority || 'Medium'}
            />
            <DetailRow
              icon="user"
              label="Assigned To"
              value={lead.assignedTo || 'Not Assigned'}
            />
            <DetailRow
              icon="dollar-sign"
              label="Expected Deal"
              value={`₹${lead.expectedValue ?? 0}`}
            />
          </Section>

          <Section title="Notes">
            <Text className="pb-4 pt-1 text-sm leading-relaxed text-slate-700">
              {lead.notes || 'No notes have been added for this lead yet.'}
            </Text>
          </Section>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
