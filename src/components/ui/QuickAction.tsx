import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

type FeatherName = ComponentProps<typeof Feather>['name'];

interface QuickActionProps {
  label: string;
  icon: FeatherName;
  color: string;
  onPress?: () => void;
}

/** Uniform tile height so a 1-line and a 2-line label still align in the grid. */
const TILE_HEIGHT = 116;

/**
 * Dashboard Quick Action tile.
 *
 * Sized as a fixed-height, centered card so any number of tiles line up in the
 * 2-column grid regardless of how long the label is.
 *
 * Examples: Add Client · New Invoice · Add Product · Stock In
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
      android_ripple={{ color: `${color}1A` }}
      style={{ height: TILE_HEIGHT }}
      className="w-full items-center justify-center rounded-2xl border border-slate-100 bg-white px-3 shadow-sm active:opacity-80"
    >
      {/* ICON */}
      <View
        className="h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}1A` }}
      >
        <Feather name={icon} size={22} color={color} />
      </View>

      {/* LABEL */}
      <Text
        numberOfLines={2}
        className="mt-3 text-center text-xs font-semibold leading-4 text-slate-700"
      >
        {label}
      </Text>
    </Pressable>
  );
}
