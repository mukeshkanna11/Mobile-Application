import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import StageBadge from '@/components/ui/StageBadge';
import { formatMoney, leadName, type Opportunity } from '@/services/opportunities';

/**
 * Premium opportunity card (replaces the web Kanban card) — title, lead, stage,
 * deal value and a probability progress bar.
 */
export default function OpportunityCard({
  opportunity,
  onPress,
}: {
  opportunity: Opportunity;
  onPress?: () => void;
}) {
  const probability = Number(opportunity.probability) || 0;

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
            {opportunity.title}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-1">
            <Feather name="user" size={12} color="#94a3b8" />
            <Text className="text-xs text-slate-500" numberOfLines={1}>
              {leadName(opportunity.lead)}
            </Text>
          </View>
        </View>
        <StageBadge stage={opportunity.stage} />
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <View>
          <Text className="text-[11px] text-slate-400">Deal Value</Text>
          <Text className="text-base font-bold text-emerald-600">
            {formatMoney(opportunity.value)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-[11px] text-slate-400">Probability</Text>
          <Text className="text-base font-bold text-indigo-600">{probability}%</Text>
        </View>
      </View>

      <View className="mt-3">
        <View className="h-2 overflow-hidden rounded-full bg-slate-200">
          <View
            className="h-full rounded-full bg-indigo-600"
            style={{ width: `${Math.min(Math.max(probability, 0), 100)}%` }}
          />
        </View>
      </View>
    </Pressable>
  );
}
