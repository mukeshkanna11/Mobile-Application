import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

type FeatherName = keyof typeof Feather.glyphMap;

export interface AIFeature {
  type: string;
  label: string;
  icon: string;
}

/** Light markdown cleanup — the insight is rendered as plain text on mobile. */
const plain = (md: string) =>
  md.replace(/^#{1,6}\s*/gm, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/^\s*[-*]\s+/gm, '• ');

/**
 * Inline AI assistant shared by the Client and Lead profiles — the mobile
 * version of the web ClientAIAssistant / LeadAIAssistant panels: feature tabs,
 * auto-run on open, loading / error-with-retry and Regenerate.
 */
export default function AIInsightPanel({
  subtitle,
  features,
  fetchInsight,
  onClose,
}: {
  subtitle?: string;
  features: readonly AIFeature[];
  fetchInsight: (type: string) => Promise<{ insight: string; model?: string }>;
  onClose: () => void;
}) {
  const [activeType, setActiveType] = useState(features[0]?.type ?? 'summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ insight: string; model?: string } | null>(null);

  const run = useCallback(
    async (type: string) => {
      setActiveType(type);
      setLoading(true);
      setError('');
      setResult(null);
      try {
        setResult(await fetchInsight(type));
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [fetchInsight]
  );

  // Web runs the active feature as soon as the assistant opens.
  useFocusEffect(
    useCallback(() => {
      if (!result && !loading && !error) run(activeType);
    }, [result, loading, error, run, activeType])
  );

  return (
    <View className="mt-4 rounded-3xl border border-indigo-100 bg-white p-4 shadow-sm">
      <View className="flex-row items-center">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
          <Feather name="cpu" size={18} color="#fff" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-base font-bold text-slate-900">AI Assistant</Text>
          {subtitle ? (
            <Text className="text-xs text-slate-500" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={onClose} hitSlop={8}>
          <Feather name="x" size={20} color="#64748b" />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ gap: 8 }}>
        {features.map((f) => {
          const active = f.type === activeType;
          return (
            <Pressable
              key={f.type}
              disabled={loading && active}
              onPress={() => run(f.type)}
              className={`flex-row items-center rounded-full px-3 py-2 ${active ? 'bg-indigo-600' : 'bg-slate-100'}`}
            >
              <Feather name={f.icon as FeatherName} size={13} color={active ? '#fff' : '#475569'} />
              <Text className={`ml-1.5 text-xs font-semibold ${active ? 'text-white' : 'text-slate-600'}`}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="mt-4 min-h-24">
        {loading ? (
          <View className="items-center py-6">
            <ActivityIndicator color="#4f46e5" />
            <Text className="mt-2 text-xs text-slate-500">Generating insight…</Text>
          </View>
        ) : error ? (
          <View className="items-center py-4">
            <Text className="mb-3 text-center text-sm text-slate-600">{error}</Text>
            <Pressable onPress={() => run(activeType)} className="rounded-xl bg-indigo-600 px-4 py-2">
              <Text className="text-sm font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : result ? (
          <Text selectable className="text-sm leading-relaxed text-slate-700">
            {plain(result.insight)}
          </Text>
        ) : null}
      </View>

      <View className="mt-4 flex-row items-center border-t border-slate-100 pt-3">
        <Text className="flex-1 text-[11px] text-slate-400">
          {result?.model ? `Powered by ${result.model}` : 'Powered by Claude AI'}
        </Text>
        <Pressable
          disabled={loading}
          onPress={() => run(activeType)}
          className="flex-row items-center rounded-xl bg-slate-100 px-3 py-2"
        >
          <Feather name="refresh-cw" size={14} color="#475569" />
          <Text className="ml-1.5 text-xs font-semibold text-slate-700">Regenerate</Text>
        </Pressable>
      </View>
    </View>
  );
}
