import { Feather } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FeatherName = keyof typeof Feather.glyphMap;

/**
 * Lightweight placeholder for bottom-tab destinations that aren't built yet.
 * Keeps the tab bar functional without scaffolding full feature screens.
 */
export default function ComingSoon({
  title,
  icon,
}: {
  title: string;
  icon: FeatherName;
}) {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-slate-50">
      <View className="h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
        <Feather name={icon} size={28} color="#4f46e5" />
      </View>
      <Text className="mt-4 text-xl font-bold text-slate-900">{title}</Text>
      <Text className="mt-1 text-sm text-slate-400">Coming soon</Text>
    </SafeAreaView>
  );
}
