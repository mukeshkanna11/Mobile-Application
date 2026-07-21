import { Text, View } from 'react-native';

import { PRIORITY_DOT, PRIORITY_STYLES, type LeadPriority } from '@/services/leads';

/**
 * Priority chip with a coloured dot — matches the web PRIORITY_STYLES/DOT maps.
 */
export default function PriorityChip({ priority }: { priority: LeadPriority }) {
  const [bg, text] = PRIORITY_STYLES[priority].split(' ');

  return (
    <View className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${bg}`}>
      <View className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[priority]}`} />
      <Text className={`text-xs font-semibold ${text}`}>{priority}</Text>
    </View>
  );
}
