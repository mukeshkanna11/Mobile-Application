import { Text, View } from 'react-native';

import { STATUS_STYLES } from '@/services/leads';

/**
 * Lead status pill using the exact web colour tokens (STATUS_STYLES).
 * Splits the "bg-… text-…" token into the container and label classes.
 */
export default function StatusBadge({ status }: { status?: string }) {
  const token = STATUS_STYLES[status ?? ''] ?? 'bg-slate-100 text-slate-600';
  const [bg, text] = token.split(' ');

  return (
    <View className={`rounded-full px-2.5 py-1 ${bg}`}>
      <Text className={`text-xs font-semibold ${text}`}>
        {status ?? 'Unknown'}
      </Text>
    </View>
  );
}
