import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import type { Client } from '@/services/clients';

/** First initial of company (fallback to contact), matching the web avatar. */
function avatarLetter(client: Client): string {
  return (client.companyName || client.contactPerson || '?')
    .charAt(0)
    .toUpperCase();
}

/**
 * Tappable list card — the mobile equivalent of a web Clients table row.
 * Keeps the web design language: indigo rounded-2xl avatar, dotted status
 * pill and a blue type badge.
 */
export default function ClientCard({
  client,
  onPress,
}: {
  client: Client;
  onPress?: () => void;
}) {
  const isActive = client.status === 'Active';

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm active:bg-indigo-50/40"
    >
      <View className="flex-row items-center gap-3">
        {/* Avatar */}
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100">
          <Text className="text-base font-bold text-indigo-700">
            {avatarLetter(client)}
          </Text>
        </View>

        {/* Identity */}
        <View className="flex-1">
          <Text
            className="text-base font-semibold text-slate-900"
            numberOfLines={1}
          >
            {client.companyName || client.contactPerson || 'Unnamed Client'}
          </Text>
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            {client.email || 'No email available'}
          </Text>
        </View>

        <Feather name="chevron-right" size={18} color="#cbd5e1" />
      </View>

      {/* Meta row */}
      <View className="mt-3 flex-row items-center gap-2">
        <View
          className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${
            isActive ? 'bg-green-100' : 'bg-slate-100'
          }`}
        >
          <View
            className={`h-1.5 w-1.5 rounded-full ${
              isActive ? 'bg-green-500' : 'bg-slate-400'
            }`}
          />
          <Text
            className={`text-xs font-semibold ${
              isActive ? 'text-green-700' : 'text-slate-600'
            }`}
          >
            {client.status || 'Unknown'}
          </Text>
        </View>

        {client.clientType ? (
          <View className="rounded-full bg-blue-50 px-2.5 py-1">
            <Text className="text-xs font-medium text-blue-700">
              {client.clientType}
            </Text>
          </View>
        ) : null}

        {client.phone ? (
          <View className="ml-auto flex-row items-center gap-1">
            <Feather name="phone" size={12} color="#94a3b8" />
            <Text className="text-xs text-slate-500">{client.phone}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
