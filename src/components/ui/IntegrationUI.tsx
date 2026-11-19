import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

/* Shared building blocks for the Integrations screens — same look as the
   existing Meta Integration screen (app/integrations/meta.tsx). */

type FeatherName = keyof typeof Feather.glyphMap;

export function ActionButton({
  icon,
  label,
  onPress,
  busy,
  disabled,
  tone = 'neutral',
}: {
  icon: FeatherName;
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone?: 'neutral' | 'primary' | 'danger';
}) {
  const cls = tone === 'primary' ? 'bg-indigo-600' : tone === 'danger' ? 'bg-rose-600' : 'border border-slate-200 bg-white';
  const color = tone === 'neutral' ? '#334155' : '#ffffff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      className={`min-w-[46%] flex-1 flex-row items-center justify-center rounded-2xl px-4 py-3 active:opacity-80 ${cls} ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      {busy ? <ActivityIndicator size="small" color={color} /> : <Feather name={icon} size={16} color={color} />}
      <Text className="ml-2 text-sm font-semibold" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function StatusChip({ on, label }: { on?: boolean; label: string }) {
  return (
    <View className={`rounded-full px-2.5 py-1 ${on ? 'bg-emerald-50' : 'bg-slate-100'}`}>
      <Text className={`text-xs font-semibold ${on ? 'text-emerald-700' : 'text-slate-500'}`}>{label}</Text>
    </View>
  );
}

export function Banner({ tone, icon, children }: { tone: 'warn' | 'error' | 'info'; icon: FeatherName; children: ReactNode }) {
  const s = {
    warn: ['border-amber-200 bg-amber-50', '#92400e', 'text-amber-800'],
    error: ['border-rose-200 bg-rose-50', '#be123c', 'text-rose-700'],
    info: ['border-slate-200 bg-slate-50', '#475569', 'text-slate-600'],
  }[tone];
  return (
    <View className={`mb-4 flex-row rounded-2xl border p-4 ${s[0]}`}>
      <Feather name={icon} size={18} color={s[1]} />
      <Text className={`ml-3 flex-1 text-sm ${s[2]}`}>{children}</Text>
    </View>
  );
}

export function Rows({ rows }: { rows: [string, string | null | undefined][] }) {
  const shown = rows.filter(([, v]) => v);
  if (!shown.length) return null;
  return (
    <View className="mt-4 border-t border-slate-100 pt-3">
      {shown.map(([label, value]) => (
        <View key={label} className="flex-row justify-between gap-4 py-1.5">
          <Text className="text-xs text-slate-500">{label}</Text>
          <Text className="flex-1 text-right text-xs font-medium text-slate-800" selectable>
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function Card({ title, right, children }: { title: string; right?: ReactNode; children?: ReactNode }) {
  return (
    <View className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-slate-900">{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleString() : null);
