import { Feather } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { getToken } from '@/services/auth';
import { mediaUrl, type WhatsAppMessage } from '@/services/whatsapp';

/* WhatsApp media goes through the authenticated backend proxy (Meta media
   URLs expire and need the workspace token — never exposed to the app).
   Instagram / Messenger attachments are Meta CDN URLs from the webhook. */

const EXT: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'video/mp4': '.mp4',
  'audio/ogg': '.ogg', 'audio/mpeg': '.mp3', 'audio/aac': '.aac', 'audio/mp4': '.m4a',
  'application/pdf': '.pdf',
};

const isImage = (m: WhatsAppMessage) =>
  /^image\//.test(m.meta?.mimeType || '') || ['image', 'sticker'].includes(m.meta?.type || m.type || '');

export default function WhatsAppMedia({ conversationId, m, outbound }: { conversationId: string; m: WhatsAppMessage; outbound: boolean }) {
  const [token, setToken] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getToken().then(setToken);
  }, []);

  const tone = outbound ? 'text-indigo-100' : 'text-slate-600';
  const iconColor = outbound ? '#e0e7ff' : '#475569';

  /** Download with the session token into the cache, then hand to the OS viewer/share sheet. */
  const open = async () => {
    if (!token || opening) return;
    try {
      setOpening(true);
      const ext = EXT[m.meta?.mimeType || ''] || (m.meta?.filename?.match(/\.[a-z0-9]+$/i)?.[0] ?? '');
      const dest = new File(Paths.cache, `wa-${m._id}${ext}`);
      const file = await File.downloadFileAsync(mediaUrl(conversationId, m._id), dest, {
        headers: { Authorization: `Bearer ${token}` },
        idempotent: true,
      });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: m.meta?.mimeType || undefined });
      else Toast.show({ type: 'info', text1: 'Downloaded', text2: 'Sharing is not available on this device.' });
    } catch {
      Toast.show({ type: 'error', text1: "Couldn't open attachment" });
    } finally {
      setOpening(false);
    }
  };

  if (m.meta?.mediaId) {
    if (isImage(m) && token && !failed) {
      return (
        <Pressable onPress={open} className="mb-1.5 overflow-hidden rounded-xl">
          <Image
            source={{ uri: mediaUrl(conversationId, m._id), headers: { Authorization: `Bearer ${token}` } }}
            style={{ width: 220, height: 220 }}
            contentFit="cover"
            onError={() => setFailed(true)}
          />
        </Pressable>
      );
    }
    return (
      <Pressable onPress={open} disabled={!token || opening} className="mb-1.5 flex-row items-center gap-2 rounded-xl bg-black/5 px-3 py-2">
        {opening ? <ActivityIndicator size="small" color={iconColor} /> : <Feather name="paperclip" size={15} color={iconColor} />}
        <Text className={`flex-1 text-xs font-medium ${tone}`} numberOfLines={1}>
          {m.meta.filename || `${m.meta.type || m.type || 'Attachment'}`} · Open
        </Text>
      </Pressable>
    );
  }

  const attachments = m.meta?.attachments?.filter((a) => a.url) ?? [];
  if (!attachments.length) return null;
  return (
    <View className="mb-1.5 gap-1">
      {attachments.map((a, i) => (
        <Pressable key={i} onPress={() => WebBrowser.openBrowserAsync(a.url!)} className="flex-row items-center gap-2 rounded-xl bg-black/5 px-3 py-2">
          <Feather name="external-link" size={14} color={iconColor} />
          <Text className={`text-xs font-medium ${tone}`}>{a.type || 'attachment'}</Text>
        </Pressable>
      ))}
    </View>
  );
}
