import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

import {
  eventTitle,
  formatDate,
  formatTime,
  ipOf,
  moduleOf,
  severityOf,
  severityStyle,
  shortId,
  userEmail,
  userInitial,
  userName,
  type AuditLog,
} from '@/services/audit';

/**
 * Audit log card — the mobile replacement for a web audit table row. Carries
 * the same cells: event + short id, user, action, module, IP, timestamp and
 * severity. Read-only: audit records are immutable, so there are no actions.
 */
export default function AuditLogCard({ log }: { log: AuditLog }) {
  const severity = severityOf(log);
  const [sevBg, sevText] = severityStyle(severity).split(' ');
  const email = userEmail(log);
  const ip = ipOf(log);

  return (
    <View className="mb-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* EVENT + TIMESTAMP */}
      <View className="flex-row items-start">
        <View className="min-w-0 flex-1">
          <Text
            className="text-sm font-semibold text-slate-900"
            numberOfLines={2}
          >
            {eventTitle(log)}
          </Text>
          <Text className="mt-0.5 text-[11px] text-slate-400">
            {shortId(log)}
          </Text>
        </View>

        <View className="ml-3 shrink-0 items-end">
          <Text className="text-[11px] font-medium text-slate-500">
            {formatDate(log.createdAt)}
          </Text>
          <Text className="mt-0.5 text-[10px] text-slate-400">
            {formatTime(log.createdAt)}
          </Text>
        </View>
      </View>

      {/* USER */}
      <View className="mt-3 flex-row items-center">
        <LinearGradient
          colors={['#4f46e5', '#2563eb']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            height: 34,
            width: 34,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text className="text-xs font-bold text-white">
            {userInitial(log)}
          </Text>
        </LinearGradient>

        <View className="ml-2.5 min-w-0 flex-1">
          <Text
            className="text-xs font-semibold text-slate-800"
            numberOfLines={1}
          >
            {userName(log)}
          </Text>
          {email ? (
            <Text className="text-[11px] text-slate-500" numberOfLines={1}>
              {email}
            </Text>
          ) : null}
        </View>
      </View>

      {/* ACTION · MODULE · SEVERITY */}
      <View className="mt-3 flex-row flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <View className="rounded-full bg-blue-100 px-2.5 py-1">
          <Text className="text-[11px] font-semibold text-blue-700">
            {log.action}
          </Text>
        </View>

        <View className="rounded-full bg-violet-100 px-2.5 py-1">
          <Text className="text-[11px] font-medium text-violet-700">
            {moduleOf(log)}
          </Text>
        </View>

        <View className={`rounded-full px-2.5 py-1 ${sevBg}`}>
          <Text className={`text-[11px] font-semibold ${sevText}`}>
            {severity}
          </Text>
        </View>

        <View className="flex-1" />

        <View className="flex-row items-center gap-1">
          <Feather name="globe" size={11} color="#94a3b8" />
          <Text className="text-[11px] text-slate-500">{ip}</Text>
        </View>
      </View>
    </View>
  );
}
