import { Feather } from '@expo/vector-icons';
import { Text, View } from 'react-native';

interface FeatureCardProps {
  title: string;
  subtitle: string;
  color: string;
}

/**
 * Glassy feature tile used on the login hero (CRM, Inventory, Projects…).
 */
export default function FeatureCard({
  title,
  subtitle,
  color,
}: FeatureCardProps) {
  return (
    <View className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-5">
      <Feather name="check-circle" size={20} color={color} />
      <Text className="mt-3 font-semibold text-white">{title}</Text>
      <Text className="mt-1 text-sm text-slate-400">{subtitle}</Text>
    </View>
  );
}
