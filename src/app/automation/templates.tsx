import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { MessageState } from '@/components/ui/StateView';
import { actionTypeMeta, AUTOMATION_TEMPLATES, TRIGGER_EVENTS } from '@/services/automations';

/**
 * Local templates (the backend has no templates endpoint — the web page also
 * uses local data). Picking one opens the builder prefilled; nothing is saved
 * until the user reviews and creates it. Optional `module` filters the list.
 */
export default function AutomationTemplatesScreen() {
  const { module } = useLocalSearchParams<{ module?: string }>();
  const list = module ? AUTOMATION_TEMPLATES.filter((t) => t.preset.module === module) : AUTOMATION_TEMPLATES;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader onBack icon="layers" title="Automation Templates" badge="CRM Automation" subtitle="Start from a ready-made workflow" />
      {list.length === 0 ? (
        <MessageState icon="layers" title="No templates for this module" message="Start from a blank automation instead." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {list.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => router.push({ pathname: '/automation/new', params: { template: t.id } })}
              className="mb-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
            >
              <View className="flex-row items-center">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50">
                  <Feather name={t.icon} size={20} color="#4f46e5" />
                </View>
                <View className="ml-3 min-w-0 flex-1">
                  <Text className="text-base font-semibold text-slate-900">{t.name}</Text>
                  <Text className="text-xs text-slate-500">
                    {t.preset.module} · {TRIGGER_EVENTS.find((e) => e.value === t.preset.event)?.label}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color="#cbd5e1" />
              </View>
              <Text className="mt-2 text-sm text-slate-600">{t.description}</Text>
              <View className="mt-2 flex-row flex-wrap gap-1.5">
                {t.preset.actions.map((a, i) => (
                  <View key={i} className="rounded-full bg-slate-100 px-2.5 py-1">
                    <Text className="text-[11px] font-medium text-slate-600">{actionTypeMeta(a.type)?.label ?? a.type}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
