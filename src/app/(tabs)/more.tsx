import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { logout } from '@/services/auth';
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

interface MenuSection {
  title: string;
  icon: FeatherName;
  items: ModuleEntry[];
}

/** Former bottom tabs + every former More option, grouped by area. */
const SECTIONS: MenuSection[] = [
  {
    title: 'Main',
    icon: 'home',
    items: [
    {
      label: 'Dashboard',
      description: 'Executive overview across CRM and ERP',
      icon: 'grid',
      tint: 'bg-indigo-50',
      color: '#4f46e5',
      onPress: () => router.navigate('/dashboard'),
    },
    {
      label: 'Clients',
      description: 'Customer accounts and contacts',
      icon: 'users',
      tint: 'bg-sky-50',
      color: '#0284c7',
      onPress: () => router.push('/clients'),
    },
    {
      label: 'Leads',
      description: 'Capture, qualify and convert leads',
      icon: 'target',
      tint: 'bg-violet-50',
      color: '#7c3aed',
      onPress: () => router.push('/leads'),
    },
    ],
  },
  {
    title: 'Sales & CRM',
    icon: 'trending-up',
    items: [
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
    ],
  },
  {
    title: 'Communication',
    icon: 'message-square',
    items: [
    {
      label: 'WhatsApp Inbox',
      description: 'Customer conversations — read and reply',
      icon: 'message-circle',
      tint: 'bg-emerald-50',
      color: '#059669',
      onPress: () => router.push('/whatsapp'),
    },
    {
      label: 'Integrations',
      description: 'WhatsApp, Instagram, Facebook / Meta, Email and Shopify',
      icon: 'grid',
      tint: 'bg-blue-50',
      color: '#2563eb',
      onPress: () => router.push('/integrations'),
    },
    {
      label: 'AI Tools',
      description: 'Content, SEO, email, communication and sales recommendations',
      icon: 'cpu',
      tint: 'bg-fuchsia-50',
      color: '#c026d3',
      onPress: () => router.push('/ai'),
    },
    ],
  },
  {
    title: 'Administration',
    icon: 'shield',
    items: [
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
    ],
  },
  {
    title: 'Account',
    icon: 'user',
    items: [
    {
      label: 'My Profile',
      description: 'Your details — name and phone',
      icon: 'user',
      tint: 'bg-indigo-50',
      color: '#4f46e5',
      onPress: () => router.push('/profile'),
    },
    {
      label: 'Notifications',
      description: 'New leads, deals, invoices, orders and security alerts',
      icon: 'bell',
      tint: 'bg-rose-50',
      color: '#e11d48',
      onPress: () => router.push('/notifications'),
    },
    ],
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

/** Full-screen Menu (route /more): replaces the bottom tab bar and the old More page. */
export default function MenuScreen() {
  const [signingOut, setSigningOut] = useState(false);

  const sections: MenuSection[] = [
    ...SECTIONS.slice(0, 2),
    { title: 'ERP', icon: 'layers', items: ERP_MODULES },
    ...SECTIONS.slice(2, 3),
    {
      title: 'CRM Automations',
      icon: 'zap',
      items: CRM_AUTOMATION_MODULES.map((m) => ({
        ...m,
        onPress: () => router.push({ pathname: '/automations/[module]', params: { module: m.module } }),
      })),
    },
    ...SECTIONS.slice(3),
  ];

  // Same sign-out as the former Dashboard button
  const handleLogout = async () => {
    try {
      setSigningOut(true);
      await logout();
      router.replace('/');
    } catch (err) {
      console.log('Logout error:', err);
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="menu"
        title="Menu"
        badge="ReadyTech Solutions"
        subtitle="Every workspace and module in one place"
      />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {sections.map((section) => (
          <View key={section.title} className="mb-6">
            <View className="mb-2.5 flex-row items-center gap-2 px-1">
              <View className="h-6 w-6 items-center justify-center rounded-lg bg-indigo-50">
                <Feather name={section.icon} size={12} color="#4f46e5" />
              </View>
              <Text className="text-xs font-semibold uppercase tracking-widest text-slate-500">{section.title}</Text>
            </View>

            <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              {section.items.map((mod, i) => (
                <Pressable
                  key={mod.label}
                  onPress={mod.onPress}
                  className={`flex-row items-center px-4 py-3.5 active:bg-slate-50 ${i > 0 ? 'border-t border-slate-100' : ''}`}
                >
                  <View className={`h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${mod.tint}`}>
                    <Feather name={mod.icon} size={20} color={mod.color} />
                  </View>
                  <View className="ml-3 min-w-0 flex-1">
                    <Text className="text-[15px] font-semibold text-slate-900">{mod.label}</Text>
                    <Text className="mt-0.5 text-xs leading-4 text-slate-500" numberOfLines={2}>
                      {mod.description}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#cbd5e1" />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Pressable
          onPress={handleLogout}
          disabled={signingOut}
          className="mt-2 flex-row items-center justify-center rounded-3xl border border-rose-200 bg-white py-4 shadow-sm active:bg-rose-50"
        >
          {signingOut ? <ActivityIndicator size="small" color="#e11d48" /> : <Feather name="log-out" size={18} color="#e11d48" />}
          <Text className="ml-2 text-base font-semibold text-rose-600">Logout</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
