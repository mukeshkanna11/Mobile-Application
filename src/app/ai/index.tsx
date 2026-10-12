import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { AI_TOOLS } from '@/services/ai';

/** AI Tools hub — the web sidebar's "AI Tools" group (5 generators). */
export default function AIToolsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="cpu"
        title="AI Tools"
        badge="Claude"
        subtitle="Content, SEO, email, communication and sales recommendations"
      />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {AI_TOOLS.map((tool) => (
          <Pressable
            key={tool.key}
            onPress={() => router.push({ pathname: '/ai/[tool]', params: { tool: tool.key } })}
            className="mb-3 flex-row items-center rounded-3xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
          >
            <View className={`h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tool.tint}`}>
              <Feather name={tool.icon} size={22} color={tool.color} />
            </View>
            <View className="ml-3 min-w-0 flex-1">
              <Text className="text-base font-semibold text-slate-900">{tool.title}</Text>
              <Text className="mt-0.5 text-xs leading-4 text-slate-500">{tool.description}</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#cbd5e1" />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
