import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader from '@/components/ui/EnterpriseHeader';

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
    label: 'Administration',
    description: 'Security, compliance and audit logs',
    icon: 'shield',
    tint: 'bg-cyan-50',
    color: '#0891b2',
    onPress: () => router.push('/administration'),
  },
];

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

        {MODULES.map((mod) => (
          <Pressable
            key={mod.label}
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
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
