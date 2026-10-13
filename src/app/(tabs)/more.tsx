import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { CRM_AUTOMATION_MODULES } from '@/services/automations';

type FeatherName = keyof typeof Feather.glyphMap;

interface ModuleEntry {
  label: string;
  description: string;
  icon: FeatherName;
  tint: string;
  color: string;
  onPress: () => void;
}

const MODULES: ModuleEntry[] = [
  {
    label: 'Salesforce',
    description: 'CRM workspace — dashboard, leads, pipeline and activities',
    icon: 'trending-up',
    tint: 'bg-indigo-50',
    color: '#4f46e5',
    onPress: () => router.push('/salesforce'),
  },
  {
    label: 'Opportunities',
    description: 'Sales pipeline, deal stages and follow-ups',
    icon: 'target',
    tint: 'bg-violet-50',
    color: '#7c3aed',
    onPress: () => router.push('/opportunities'),
  },
  {
    label: 'Invoices',
    description: 'Billing — create, send and track invoices',
    icon: 'file-text',
    tint: 'bg-amber-50',
    color: '#d97706',
    onPress: () => router.push('/invoices'),
  },
  {
    label: 'WhatsApp Inbox',
    description: 'Customer conversations — read and reply',
    icon: 'message-circle',
    tint: 'bg-emerald-50',
    color: '#059669',
    onPress: () => router.push('/whatsapp'),
  },
  {
    label: 'Meta Integration',
    description: 'Facebook, Instagram and WhatsApp Business connection',
    icon: 'link',
    tint: 'bg-blue-50',
    color: '#2563eb',
    onPress: () => router.push('/integrations/meta'),
  },
  {
    label: 'AI Tools',
    description: 'Content, SEO, email, communication and sales recommendations',
    icon: 'cpu',
    tint: 'bg-fuchsia-50',
    color: '#c026d3',
    onPress: () => router.push('/ai'),
  },
  {
    label: 'Users',
    description: 'Team members, roles and access',
    icon: 'user-check',
    tint: 'bg-slate-100',
    color: '#475569',
    onPress: () => router.push('/users'),
  },
  {
    label: 'Administration',
    description: 'Security, compliance and audit logs',
    icon: 'shield',
    tint: 'bg-cyan-50',
    color: '#0891b2',
    onPress: () => router.push('/administration'),
  },
];

/** ERP modules — same order as the web ERP sidebar. */
const ERP_MODULES: ModuleEntry[] = [
  {
    label: 'Products',
    description: 'Product catalogue, pricing and barcodes',
    icon: 'package',
    tint: 'bg-indigo-50',
    color: '#4f46e5',
    onPress: () => router.push('/products'),
  },
  {
    label: 'Warehouses',
    description: 'Storage sites, capacity and contacts',
    icon: 'home',
    tint: 'bg-sky-50',
    color: '#0284c7',
    onPress: () => router.push('/warehouses'),
  },
  {
    label: 'Vendors',
    description: 'ERP suppliers — contacts, setup status and purchasing partners',
    icon: 'truck',
    tint: 'bg-amber-50',
    color: '#d97706',
    onPress: () => router.push('/vendors'),
  },
  {
    label: 'Purchase Orders',
    description: 'ERP purchasing — vendor orders and stock receipts',
    icon: 'shopping-cart',
    tint: 'bg-emerald-50',
    color: '#059669',
    onPress: () => router.push('/purchase-orders'),
  },
  {
    label: 'Sales Orders',
    description: 'ERP sales — customer orders, approval and delivery',
    icon: 'file-text',
    tint: 'bg-violet-50',
    color: '#7c3aed',
    onPress: () => router.push('/sales-orders'),
  },
  {
    label: 'Inventory',
    description: 'Stock levels by warehouse, stock in/out and export',
    icon: 'layers',
    tint: 'bg-rose-50',
    color: '#e11d48',
    onPress: () => router.push('/inventory'),
  },
  {
    label: 'Stock Adjustment',
    description: 'Increase or decrease stock with a reason',
    icon: 'sliders',
    tint: 'bg-orange-50',
    color: '#ea580c',
    onPress: () => router.push('/stock-adjustment'),
  },
  {
    label: 'Warehouse Transfer',
    description: 'Move stock between warehouses',
    icon: 'repeat',
    tint: 'bg-teal-50',
    color: '#0d9488',
    onPress: () => router.push('/warehouse-transfer'),
  },
];

const SECTION_ICON: Record<string, FeatherName> = { ERP: 'layers', 'CRM Automations': 'zap' };

export default function MoreScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        icon="grid"
        title="More"
        badge="ReadyTech Solutions"
        subtitle="Additional workspaces and business modules"
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Workspaces
        </Text>

        {[
          ...MODULES.map((m) => ({ ...m, section: 'Workspaces' })),
          ...ERP_MODULES.map((m) => ({ ...m, section: 'ERP' })),
          ...CRM_AUTOMATION_MODULES.map((m) => ({
            ...m,
            section: 'CRM Automations',
            onPress: () => router.push({ pathname: '/automations/[module]', params: { module: m.module } }),
          })),
        ].map((mod, i, all) => (
          <View key={mod.label}>
            {/* Section heading whenever the group changes (ERP and CRM Automations kept separate) */}
            {i > 0 && all[i - 1].section !== mod.section ? (
              <View className="mb-3 mt-4 flex-row items-center gap-2">
                <Feather name={SECTION_ICON[mod.section] ?? 'grid'} size={13} color="#4f46e5" />
                <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {mod.section}
                </Text>
              </View>
            ) : null}
          <Pressable
            onPress={mod.onPress}
            className="mb-3 flex-row items-center rounded-3xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
          >
            <View
              className={`h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${mod.tint}`}
            >
              <Feather name={mod.icon} size={22} color={mod.color} />
            </View>

            <View className="ml-3 min-w-0 flex-1">
              <Text className="text-base font-semibold text-slate-900">
                {mod.label}
              </Text>
              <Text className="mt-0.5 text-xs leading-4 text-slate-500">
                {mod.description}
              </Text>
            </View>

            <Feather name="chevron-right" size={18} color="#cbd5e1" />
          </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
