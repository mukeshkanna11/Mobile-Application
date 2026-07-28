import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { ComponentProps } from 'react';

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

      className="flex-1 p-4 bg-white border  rounded-2xl border-slate-100 active:opacity-80"

    >


      {/* ICON */}

      <View
        className={`
          h-10
          w-10
          items-center
          justify-center
          rounded-xl
          ${tint}
        `}
      >

        <Feather
          name={icon}
          size={20}
          color={iconColor}
        />

      </View>




      {/* VALUE */}

      {
        loading ?

        <ActivityIndicator

          className="self-start mt-3 "

          color={iconColor}

        />

        :

        <Text
          className="mt-3 text-2xl font-bold  text-slate-900"
        >

          {value}

        </Text>

      }




      {/* LABEL */}

      <Text
        className="mt-1 text-sm  text-slate-500"
      >

        {label}

      </Text>


    </Pressable>

  );

}