import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

type FeatherName = ComponentProps<typeof Feather>['name'];

interface StatCardProps {
  label: string;
  value: number | string;
  icon: FeatherName;

  /**
   * Tailwind background color class
   * Example: bg-indigo-100
   */
  tint: string;

  /**
   * Feather icon color
   * Example: #4f46e5
   */
  iconColor: string;

  loading?: boolean;

  /**
   * Card click navigation
   */
  onPress?: () => void;
}

/**
 * Fixed height so every tile in the KPI grid lines up, whether it holds a
 * single digit ("6") or a wrapped currency string ("₹1,23,456").
 */
const CARD_HEIGHT = 124;

/**
 * Dashboard KPI Metric Card
 * Used for:
 * Clients
 * Products
 * Inventory
 * Invoices
 * Opportunities
 * Revenue
 */
export default function StatCard({
  label,
  value,
  icon,
  tint,
  iconColor,
  loading = false,
  onPress,
}: StatCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{ height: CARD_HEIGHT }}
      className="w-full justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm active:opacity-80"
    >
      {/* ICON */}
      <View
        className={`h-10 w-10 items-center justify-center rounded-xl ${tint}`}
      >
        <Feather name={icon} size={20} color={iconColor} />
      </View>

      <View>
        {/* VALUE — shrinks to fit so long currency never wraps or clips */}
        {loading ? (
          <ActivityIndicator className="mb-1 self-start" color={iconColor} />
        ) : (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            className="text-2xl font-bold text-slate-900"
          >
            {value}
          </Text>
        )}

        {/* LABEL */}
        <Text numberOfLines={1} className="mt-0.5 text-sm text-slate-500">
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
