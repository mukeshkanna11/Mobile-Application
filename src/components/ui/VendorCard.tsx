import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import Badge from '@/components/ui/Badge';
import { vendorStatus, type Vendor } from '@/services/vendors';

/** Vendor list card — name, setup status and contact details. */
export default function VendorCard({
  vendor,
  onPress,
}: {
  vendor: Vendor;
  onPress?: () => void;
}) {
  const isActive = vendorStatus(vendor) === 'Active';

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
    >
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100">
          <Feather name="truck" size={20} color="#4f46e5" />
        </View>

        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
            {vendor.name}
          </Text>
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            {vendor.email || 'No email'}
          </Text>
        </View>

        <Feather name="chevron-right" size={18} color="#cbd5e1" />
      </View>

      <View className="mt-3 flex-row items-center gap-2">
        <Badge
          label={isActive ? 'Active' : 'Pending'}
          bg={isActive ? 'bg-emerald-100' : 'bg-amber-100'}
          text={isActive ? 'text-emerald-700' : 'text-amber-700'}
          dot={isActive ? 'bg-emerald-500' : 'bg-amber-500'}
        />
        {vendor.phone ? (
          <View className="flex-row items-center gap-1">
            <Feather name="phone" size={12} color="#94a3b8" />
            <Text className="text-xs text-slate-500">{vendor.phone}</Text>
          </View>
        ) : null}
      </View>

      {vendor.address ? (
        <View className="mt-2 flex-row items-center gap-1">
          <Feather name="map-pin" size={12} color="#94a3b8" />
          <Text className="flex-1 text-xs text-slate-500" numberOfLines={1}>
            {vendor.address}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
