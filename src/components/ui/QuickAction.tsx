import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

type FeatherName = keyof typeof Feather.glyphMap;

interface QuickActionProps {
  label: string;
  icon: FeatherName;
  color: string;
  onPress?: () => void;
}

/**
 * Square shortcut button used in the dashboard "Quick Actions" row.
 */
export default function QuickAction({
  label,
  icon,
  color,
  onPress,
}: QuickActionProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm active:opacity-80"
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}1A` }}
      >
        <Feather name={icon} size={20} color={color} />
      </View>
      <Text className="text-center text-xs font-medium text-slate-700">
        {label}
      </Text>
    </Pressable>
  );
}
