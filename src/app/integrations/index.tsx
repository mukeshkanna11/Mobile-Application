import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { StatusChip } from '@/components/ui/IntegrationUI';
import { fetchEmailStatus, fetchShopifyStatus, type EmailStatus, type ShopifyStatus } from '@/services/integrations';
import { fetchMetaStatus, type MetaStatus } from '@/services/meta';

type FeatherName = keyof typeof Feather.glyphMap;

/** Unified Integrations — same list as the web sidebar (Twilio / VoIP excluded for now). */
export default function IntegrationsHub() {
  const [meta, setMeta] = useState<MetaStatus | null>(null);
  const [email, setEmail] = useState<EmailStatus | null>(null);
  const [shopify, setShopify] = useState<ShopifyStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Each status loads independently: one failing (e.g. 403 for non-admins) never hides the others
  const load = useCallback(async () => {
    await Promise.allSettled([
      fetchMetaStatus().then(setMeta),
      fetchEmailStatus().then(setEmail),
      fetchShopifyStatus().then(setShopify),
    ]);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const ig = meta?.instagramInbox;
  const mailboxes = email?.accounts.length ?? 0;
  const shop = shopify?.connection;

  const items: { href: Href; icon: FeatherName; color: string; title: string; detail: string; on?: boolean; known: boolean }[] = [
    {
      href: '/integrations/whatsapp',
      icon: 'message-circle',
      color: '#16a34a',
      title: 'WhatsApp',
      detail: meta?.whatsapp?.displayPhoneNumber || 'Business number, inbox and sync',
      on: meta?.whatsapp?.connected,
      known: !!meta,
    },
    {
      href: '/integrations/instagram',
      icon: 'instagram',
      color: '#db2777',
      title: 'Instagram',
      detail: ig?.username ? `@${ig.username}` : 'Direct messages inbox',
      on: ig?.connected,
      known: !!meta,
    },
    {
      href: '/integrations/meta',
      icon: 'facebook',
      color: '#2563eb',
      title: 'Facebook / Meta',
      detail: meta?.facebookPage?.name || 'Business account, Page and webhooks',
      on: meta?.connected,
      known: !!meta,
    },
    {
      href: '/integrations/email',
      icon: 'mail',
      color: '#7c3aed',
      title: 'Email',
      detail: mailboxes ? `${mailboxes} mailbox${mailboxes === 1 ? '' : 'es'} · Gmail, Outlook, Zoho, SMTP` : 'Gmail, Outlook, Zoho and SMTP',
      on: mailboxes > 0,
      known: !!email,
    },
    {
      href: '/integrations/shopify',
      icon: 'shopping-bag',
      color: '#65a30d',
      title: 'Shopify',
      detail: shop?.shopDomain || 'Orders, inventory and webhooks',
      on: shop?.connected,
      known: !!shopify,
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader onBack icon="grid" title="Integrations" subtitle="Connections for this workspace only." />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        {items.map((it) => (
          <Pressable
            key={it.title}
            onPress={() => router.push(it.href)}
            className="mb-3 flex-row items-center rounded-3xl border border-slate-200 bg-white p-4 shadow-sm active:opacity-80"
          >
            <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${it.color}1a` }}>
              <Feather name={it.icon} size={20} color={it.color} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-slate-900">{it.title}</Text>
              <Text className="text-xs text-slate-500" numberOfLines={1}>
                {it.detail}
              </Text>
            </View>
            {it.known ? <StatusChip on={it.on} label={it.on ? 'Connected' : 'Not connected'} /> : null}
            <Feather name="chevron-right" size={18} color="#94a3b8" style={{ marginLeft: 6 }} />
          </Pressable>
        ))}
        <Text className="mt-2 px-1 text-xs text-slate-400">Twilio voice calling will be added to mobile later.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
