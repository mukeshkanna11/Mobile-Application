import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import ConversationDetails from '@/components/ui/ConversationDetails';
import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import WhatsAppMedia from '@/components/ui/WhatsAppMedia';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import { isForbidden } from '@/services/products';
import {
  conversationName,
  fetchMessages,
  isWindowExpired,
  markConversationRead,
  mergeMessages,
  OUTBOUND_MIME_TYPES,
  outboundMediaError,
  sendWhatsAppMessage,
  type Conversation,
  type MessageStatus,
  type WhatsAppMessage,
} from '@/services/whatsapp';

const PAGE_SIZE = 30;
/** Thread refresh while the screen is focused (webhooks land server-side). */
const THREAD_REFRESH_MS = 15000;

type FeatherName = keyof typeof Feather.glyphMap;

const STATUS_ICON: Record<MessageStatus, { icon: FeatherName; color: string }> = {
  pending: { icon: 'clock', color: '#c7d2fe' },
  sent: { icon: 'check', color: '#c7d2fe' },
  delivered: { icon: 'check-circle', color: '#c7d2fe' },
  read: { icon: 'check-circle', color: '#6ee7b7' },
  failed: { icon: 'alert-circle', color: '#fecaca' },
};

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

function Bubble({ m, conversationId }: { m: WhatsAppMessage; conversationId: string }) {
  const out = m.direction === 'outbound';
  const st = out && m.status ? STATUS_ICON[m.status] : null;
  return (
    <View className={`mb-2 max-w-[82%] ${out ? 'self-end' : 'self-start'}`}>
      <View
        className={`rounded-2xl px-3.5 py-2 ${
          out ? 'rounded-br-md bg-indigo-600' : 'rounded-bl-md border border-slate-100 bg-white'
        } ${m.status === 'failed' ? 'bg-red-600' : ''}`}
      >
        <WhatsAppMedia conversationId={conversationId} m={m} outbound={out} />
        {m.body && !(m.meta?.mediaId && m.body === `[${m.type}]`) ? (
          <Text className={`text-sm leading-5 ${out ? 'text-white' : 'text-slate-800'}`}>{m.body}</Text>
        ) : !m.meta?.mediaId && m.type && m.type !== 'text' ? (
          <Text className={`text-sm leading-5 ${out ? 'text-white' : 'text-slate-800'}`}>[{m.type}]</Text>
        ) : null}
        <View className="mt-1 flex-row items-center justify-end">
          <Text className={`text-[10px] ${out ? 'text-indigo-100' : 'text-slate-400'}`}>{timeOf(m.timestamp)}</Text>
          {st ? <Feather name={st.icon} size={11} color={st.color} style={{ marginLeft: 4 }} /> : null}
        </View>
      </View>
      {m.status === 'failed' && m.error?.message ? (
        <Text className="mt-1 text-right text-[11px] text-red-600">{m.error.message}</Text>
      ) : null}
    </View>
  );
}

export default function WhatsAppThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [olderPage, setOlderPage] = useState(1);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [attachment, setAttachment] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const sendingRef = useRef(false);
  const loadedRef = useRef(false);

  /** Fetches the newest page and merges it (keeps older pages already loaded). */
  const load = useCallback(
    async (silent = false) => {
      if (!id) return;
      try {
        const res = await fetchMessages(id, { page: 1, limit: PAGE_SIZE });
        setConversation(res.conversation);
        setMessages((prev) => mergeMessages(prev, res.messages));
        if (!loadedRef.current) setHasOlder((res.pagination?.pages ?? 1) > 1);
        loadedRef.current = true;
        setError(false);
        // Opening (or new inbound while open) clears the unread badge, as on web.
        if ((res.conversation?.unreadCount ?? 0) > 0) markConversationRead(id).catch(() => {});
      } catch (err) {
        if (!silent && !loadedRef.current) {
          setForbidden(isForbidden(err));
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(() => load(true), THREAD_REFRESH_MS);
      return () => clearInterval(t);
    }, [load])
  );

  const loadOlder = useCallback(async () => {
    if (!id || !hasOlder || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const next = olderPage + 1;
      const res = await fetchMessages(id, { page: next, limit: PAGE_SIZE });
      setMessages((prev) => mergeMessages(res.messages, prev));
      setOlderPage(next);
      setHasOlder(next < (res.pagination?.pages ?? next));
    } catch {
      Toast.show({ type: 'error', text1: "Couldn't load older messages" });
    } finally {
      setLoadingOlder(false);
    }
  }, [id, hasOlder, loadingOlder, olderPage]);

  const windowOpen = conversation?.window?.open !== false;
  // Attachments are WhatsApp-only (Instagram / Messenger replies are text)
  const canAttach = !conversation?.channel || conversation.channel === 'whatsapp';

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: OUTBOUND_MIME_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const problem = outboundMediaError(asset.mimeType, asset.size);
      if (problem) {
        Toast.show({ type: 'error', text1: 'Attachment not supported', text2: problem });
        return;
      }
      setAttachment(asset);
    } catch {
      Toast.show({ type: 'error', text1: "Couldn't open the file picker" });
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!id || (!body && !attachment) || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      // Same payload as the web: { data: data URL, mimeType, filename }
      const media = attachment
        ? {
            data: `data:${attachment.mimeType};base64,${await new File(attachment.uri).base64()}`,
            mimeType: attachment.mimeType || 'application/octet-stream',
            filename: attachment.name,
          }
        : null;
      await sendWhatsAppMessage(id, body, media);
      setText('');
      setAttachment(null);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: isWindowExpired(err) ? '24-hour window expired' : 'Message not sent',
        text2: err?.response?.data?.message ?? 'Please try again.',
      });
    } finally {
      sendingRef.current = false;
      setSending(false);
      // Refresh either way: a failed attempt is stored with its error.
      load(true);
    }
  };

  // Inverted list renders newest at the bottom without manual scrolling.
  const inverted = useMemo(() => [...messages].reverse(), [messages]);
  const title = conversation ? conversationName(conversation) : 'Conversation';

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
      <EnterpriseHeader
        onBack
        icon="message-circle"
        title={title}
        subtitle={conversation?.phoneNumber}
        right={
          <>
            {conversation?.lead ? (
              <HeaderAction
                icon="user"
                onPress={() => router.push({ pathname: '/lead/[id]', params: { id: conversation.lead!._id } })}
              />
            ) : null}
            {conversation ? (
              <HeaderAction
                icon="info"
                onPress={() => setShowDetails((v) => !v)}
                color={showDetails ? '#c7d2fe' : '#ffffff'}
              />
            ) : null}
            <HeaderAction icon="refresh-cw" onPress={() => load()} />
          </>
        }
      />

      {loading ? (
        <LoadingState label="Loading messages…" />
      ) : error && forbidden ? (
        <MessageState
          icon="lock"
          title="Access restricted"
          message="Your account can't view this conversation."
        />
      ) : error ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load conversation"
          message="It may have been removed, or the connection failed."
          actionLabel="Retry"
          onAction={() => {
            setLoading(true);
            load();
          }}
        />
      ) : (
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {showDetails && conversation ? (
            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              <ConversationDetails conversation={conversation} onChange={setConversation} />
            </ScrollView>
          ) : null}
          <FlatList
            data={inverted}
            inverted
            keyExtractor={(m) => m._id}
            contentContainerStyle={{ padding: 16, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => <Bubble m={item} conversationId={id!} />}
            onEndReached={loadOlder}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingOlder ? (
                <ActivityIndicator className="py-3" color="#4f46e5" />
              ) : hasOlder ? (
                <Pressable onPress={loadOlder} className="items-center py-3">
                  <Text className="text-xs font-medium text-indigo-600">Load older messages</Text>
                </Pressable>
              ) : null
            }
            ListEmptyComponent={
              <View style={{ transform: [{ scaleY: -1 }] }} className="flex-1 items-center justify-center py-16">
                <Feather name="message-circle" size={28} color="#cbd5e1" />
                <Text className="mt-2 text-sm text-slate-400">No messages yet</Text>
              </View>
            }
          />

          {!windowOpen ? (
            <View className="mx-4 mb-2 flex-row items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <Feather name="clock" size={14} color="#b45309" />
              <Text className="flex-1 text-xs leading-5 text-amber-800">
                The 24-hour reply window has expired. WhatsApp only allows an approved template
                message until the customer writes again.
              </Text>
            </View>
          ) : null}

          {attachment ? (
            <View className="flex-row items-center gap-3 border-t border-slate-200 bg-white px-3 pt-2">
              {/^image\//.test(attachment.mimeType || '') ? (
                <Image source={{ uri: attachment.uri }} style={{ width: 44, height: 44, borderRadius: 10 }} contentFit="cover" />
              ) : (
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                  <Feather name="file" size={18} color="#475569" />
                </View>
              )}
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-medium text-slate-800" numberOfLines={1}>
                  {attachment.name}
                </Text>
                <Text className="text-xs text-slate-500">
                  {attachment.size ? `${(attachment.size / 1024 / 1024).toFixed(2)} MB` : attachment.mimeType}
                </Text>
              </View>
              <Pressable
                onPress={() => setAttachment(null)}
                disabled={sending}
                accessibilityLabel="Remove attachment"
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
              >
                <Feather name="x" size={15} color="#475569" />
              </Pressable>
            </View>
          ) : null}

          <View className={`flex-row items-end gap-2 bg-white px-3 py-2 ${attachment ? '' : 'border-t border-slate-200'}`}>
            {canAttach ? (
              <Pressable
                onPress={pickFile}
                disabled={!windowOpen || sending}
                accessibilityRole="button"
                accessibilityLabel="Attach file"
                className="h-11 w-11 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200"
              >
                <Feather name="paperclip" size={18} color={!windowOpen ? '#cbd5e1' : '#475569'} />
              </Pressable>
            ) : null}
            <TextInput
              className="max-h-28 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-base text-slate-800"
              placeholder={windowOpen ? (attachment ? 'Add a caption (optional)' : 'Type a message') : 'Reply window expired'}
              placeholderTextColor="#94a3b8"
              value={text}
              onChangeText={setText}
              editable={windowOpen && !sending}
              multiline
              maxLength={4096}
            />
            <Pressable
              onPress={send}
              disabled={!windowOpen || sending || (!text.trim() && !attachment)}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              className={`h-11 w-11 items-center justify-center rounded-full ${
                !windowOpen || (!text.trim() && !attachment) ? 'bg-slate-300' : 'bg-emerald-600 active:opacity-80'
              }`}
            >
              {sending ? <ActivityIndicator color="#ffffff" /> : <Feather name="send" size={18} color="#ffffff" />}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
