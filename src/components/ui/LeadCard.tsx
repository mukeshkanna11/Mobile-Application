import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Menu } from 'react-native-paper';

import PriorityChip from '@/components/ui/PriorityChip';
import StatusBadge from '@/components/ui/StatusBadge';
import { LEAD_STATUSES, priorityOf, type Lead } from '@/services/leads';

/**
 * Premium lead card — the mobile replacement for a web table row.
 * Tapping the card opens the profile; tapping the status badge opens an inline
 * status menu (the web's inline <select> + optimistic updateLeadStatus).
 */
export default function LeadCard({
  lead,
  onPress,
  onChangeStatus,
}: {
  lead: Lead;
  onPress?: () => void;
  onChangeStatus?: (status: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const priority = priorityOf(lead.status);
  const initial = (lead.name || '?').charAt(0).toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
    >
      <View className="flex-row items-center gap-3">
        {/* Gradient avatar */}
        <LinearGradient
          colors={['#6366f1', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            height: 44,
            width: 44,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text className="text-base font-bold text-white">{initial}</Text>
        </LinearGradient>

        {/* Identity */}
        <View className="flex-1">
          <Text
            className="text-base font-semibold text-slate-900"
            numberOfLines={1}
          >
            {lead.name || 'Unnamed'}
          </Text>
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            {lead.company || lead.email || '—'}
          </Text>
        </View>

        <Feather name="chevron-right" size={18} color="#cbd5e1" />
      </View>

      {/* Contact */}
      {(lead.email || lead.phone) && (
        <View className="mt-3 gap-1">
          {lead.email ? (
            <View className="flex-row items-center gap-2">
              <Feather name="mail" size={13} color="#94a3b8" />
              <Text className="text-xs text-slate-600" numberOfLines={1}>
                {lead.email}
              </Text>
            </View>
          ) : null}
          {lead.phone ? (
            <View className="flex-row items-center gap-2">
              <Feather name="phone" size={13} color="#94a3b8" />
              <Text className="text-xs text-slate-600">{lead.phone}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Meta row */}
      <View className="mt-3 flex-row items-center gap-2">
        {/* Inline status menu */}
        <Menu
          visible={menuOpen}
          onDismiss={() => setMenuOpen(false)}
          anchor={
            <Pressable
              onPress={() => onChangeStatus && setMenuOpen(true)}
              className="flex-row items-center gap-1"
            >
              <StatusBadge status={lead.status} />
              {onChangeStatus ? (
                <Feather name="chevron-down" size={13} color="#94a3b8" />
              ) : null}
            </Pressable>
          }
        >
          {LEAD_STATUSES.map((s) => (
            <Menu.Item
              key={s}
              title={s}
              onPress={() => {
                setMenuOpen(false);
                if (s !== lead.status) onChangeStatus?.(s);
              }}
            />
          ))}
        </Menu>

        <PriorityChip priority={priority} />

        {lead.source ? (
          <View className="rounded-full bg-slate-100 px-2.5 py-1">
            <Text className="text-xs font-medium text-slate-600">
              {lead.source}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
