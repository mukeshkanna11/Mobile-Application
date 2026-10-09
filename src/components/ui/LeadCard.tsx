import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Menu } from 'react-native-paper';

import PriorityChip from '@/components/ui/PriorityChip';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatINR, LEAD_STATUS_OPTIONS, priorityOf, type Lead } from '@/services/leads';

/**
 * Premium lead card — the mobile replacement for a web table row.
 * Tapping the card opens the profile; tapping the status badge opens an inline
 * status menu (the web's inline <select> + optimistic updateLeadStatus).
 */
export default function LeadCard({
  lead,
  onPress,
  onChangeStatus,
  onEdit,
  onDelete,
}: {
  lead: Lead;
  onPress?: () => void;
  onChangeStatus?: (status: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const priority = priorityOf(lead);
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
          {LEAD_STATUS_OPTIONS.map((s) => (
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
        {lead.isConverted ? (
          <View className="rounded-full bg-emerald-50 px-2.5 py-1">
            <Text className="text-xs font-semibold text-emerald-700">Converted</Text>
          </View>
        ) : null}
      </View>

      {/* Value / follow-up / created + row actions (web table columns) */}
      <View className="mt-3 flex-row items-center border-t border-slate-100 pt-3">
        <View className="flex-1">
          <Text className="text-xs font-semibold text-slate-800">
            {formatINR(lead.value)}
            <Text className="font-normal text-slate-400"> · exp. {formatINR(lead.expectedValue)}</Text>
          </Text>
          <Text className="mt-0.5 text-[11px] text-slate-400" numberOfLines={1}>
            {lead.nextFollowUpAt || lead.followUpDate
              ? `Follow-up ${new Date((lead.nextFollowUpAt || lead.followUpDate)!).toLocaleDateString('en-IN')}`
              : 'No follow-up'}
            {lead.createdAt ? ` · Created ${new Date(lead.createdAt).toLocaleDateString()}` : ''}
          </Text>
        </View>
        {onEdit ? (
          <Pressable onPress={onEdit} hitSlop={6} className="ml-2 rounded-xl bg-slate-50 p-2 active:opacity-70">
            <Feather name="edit-2" size={15} color="#475569" />
          </Pressable>
        ) : null}
        {onDelete ? (
          <Pressable onPress={onDelete} hitSlop={6} className="ml-2 rounded-xl bg-red-50 p-2 active:opacity-70">
            <Feather name="trash-2" size={15} color="#dc2626" />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}
