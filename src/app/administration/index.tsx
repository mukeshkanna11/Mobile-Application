import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader from '@/components/ui/EnterpriseHeader';

type FeatherName = keyof typeof Feather.glyphMap;

interface AdminEntry {
  label: string;
  description: string;
  icon: FeatherName;
  tint: string;
  color: string;
  go: () => void;
}

const ADMIN_ENTRIES: AdminEntry[] = [
  {
    label: 'Audit Logs',
    description:
      'User activity, authentication events and compliance records.',
    icon: 'shield',
    tint: 'bg-cyan-50',
    color: '#0891b2',
    go: () => router.push('/administration/audit-logs'),
  },
];

/** Administration hub — More → Administration → Audit Logs. */
export default function AdministrationHomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        title="Administration"
        badge="Security Center"
        subtitle="Security, compliance and system administration"
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Security & Compliance
        </Text>

        {ADMIN_ENTRIES.map((entry) => (
          <Pressable
            key={entry.label}
            onPress={entry.go}
            className="mb-3 flex-row items-center rounded-3xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
          >
            <View
              className={`h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${entry.tint}`}
            >
              <Feather name={entry.icon} size={22} color={entry.color} />
            </View>

            <View className="ml-3 min-w-0 flex-1">
              <Text className="text-base font-semibold text-slate-900">
                {entry.label}
              </Text>
              <Text className="mt-0.5 text-xs leading-4 text-slate-500">
                {entry.description}
              </Text>
            </View>

            <Feather name="chevron-right" size={18} color="#cbd5e1" />
          </Pressable>
        ))}

        {/* Security notice — mirrors the web module's compliance callout */}
        <View className="mt-2 rounded-3xl border border-amber-200 bg-amber-50 p-4">
          <View className="flex-row items-center gap-2">
            <Feather name="alert-triangle" size={15} color="#b45309" />
            <Text className="text-sm font-semibold text-amber-800">
              Security & Compliance Notice
            </Text>
          </View>
          <Text className="mt-2 text-xs leading-5 text-amber-700">
            Audit logs are immutable security records capturing authentication,
            configuration changes, permission updates and critical system
            events. They support compliance audits, forensic investigations and
            regulatory reporting.
          </Text>
        </View>

        <View className="mt-4 flex-row items-center justify-center gap-2">
          <View className="h-2 w-2 rounded-full bg-emerald-500" />
          <Text className="text-xs text-slate-400">
            System Protected · Monitoring Enabled
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
