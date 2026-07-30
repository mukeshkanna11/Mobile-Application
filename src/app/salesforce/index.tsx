import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader from '@/components/ui/EnterpriseHeader';

type FeatherName = keyof typeof Feather.glyphMap;

interface WorkspaceEntry {
  label: string;
  description: string;
  icon: FeatherName;
  tint: string;
  color: string;
  /** Where this card goes — existing module routes are reused as-is. */
  go: () => void;
  /** Shown when the destination is an already-completed module. */
  reused?: boolean;
}

/**
 * Salesforce workspace navigation — the mobile equivalent of the web
 * SalesforceModule.jsx tab grid. Every entry other than Dashboard hands off to
 * an existing module route; no CRUD is duplicated here.
 */
const WORKSPACE: WorkspaceEntry[] = [
  {
    label: 'Dashboard',
    description: 'Pipeline health, conversion and recent CRM activity.',
    icon: 'bar-chart-2',
    tint: 'bg-indigo-50',
    color: '#4f46e5',
    go: () => router.push('/salesforce/dashboard'),
  },
  {
    label: 'Lead Management',
    description: 'Capture, qualify and convert sales leads.',
    icon: 'users',
    tint: 'bg-sky-50',
    color: '#0284c7',
    go: () => router.push('/leads'),
    reused: true,
  },
  {
    label: 'Sales Pipeline',
    description: 'Track opportunities and deal progress.',
    icon: 'target',
    tint: 'bg-violet-50',
    color: '#7c3aed',
    go: () => router.push('/opportunities'),
    reused: true,
  },
  {
    label: 'Activities',
    description: 'Calls, emails and meetings across your CRM.',
    icon: 'activity',
    tint: 'bg-emerald-50',
    color: '#059669',
    go: () => router.push('/salesforce/activities'),
  },
];

export default function SalesforceHomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        title="Salesforce"
        badge="Enterprise CRM"
        subtitle="Access all ReadyTech CRM business modules from one place"
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            CRM Workspace
          </Text>
          <View className="rounded-full bg-indigo-100 px-2.5 py-1">
            <Text className="text-[11px] font-semibold text-indigo-700">
              {WORKSPACE.length} Modules
            </Text>
          </View>
        </View>

        {WORKSPACE.map((entry) => (
          <Pressable
            key={entry.label}
            onPress={entry.go}
            className="mb-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
          >
            <View className="flex-row items-center">
              <View
                className={`h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${entry.tint}`}
              >
                <Feather name={entry.icon} size={22} color={entry.color} />
              </View>

              <View className="ml-3 min-w-0 flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-semibold text-slate-900">
                    {entry.label}
                  </Text>
                  {entry.reused ? (
                    <View className="rounded-full bg-slate-100 px-2 py-0.5">
                      <Text className="text-[10px] font-semibold text-slate-500">
                        Existing module
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text className="mt-0.5 text-xs leading-4 text-slate-500">
                  {entry.description}
                </Text>
              </View>

              <Feather name="chevron-right" size={18} color="#cbd5e1" />
            </View>
          </Pressable>
        ))}

        <View className="mt-2 flex-row items-center justify-center gap-2">
          <View className="h-2 w-2 rounded-full bg-emerald-500" />
          <Text className="text-xs text-slate-400">
            ReadyTech CRM · Operational
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
