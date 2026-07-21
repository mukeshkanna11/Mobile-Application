import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

type FeatherName = keyof typeof Feather.glyphMap;

/**
 * Enterprise gradient banner — the mobile equivalent of the web CRM header
 * (`bg-gradient-to-br from-slate-950 via-indigo-900 to-blue-900` with glow
 * blobs, icon tile and a "ReadyTech Solutions" badge). Shared across the
 * Clients screens so branding stays consistent.
 */
export default function EnterpriseHeader({
  title,
  subtitle,
  badge,
  icon,
  onBack,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: FeatherName;
  onBack?: boolean | (() => void);
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const handleBack =
    typeof onBack === 'function' ? onBack : () => router.back();

  return (
    <LinearGradient
      colors={['#020617', '#312e81', '#1e3a8a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
      }}
    >
      {/* Glow accents */}
      <View className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/20" />
      <View className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-indigo-500/20" />

      <View className="px-5 pb-5 pt-3">
        <View className="flex-row items-center gap-3">
          {onBack ? (
            <Pressable
              hitSlop={10}
              onPress={handleBack}
              className="h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 active:opacity-80"
            >
              <Feather name="arrow-left" size={20} color="#ffffff" />
            </Pressable>
          ) : icon ? (
            <View className="h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
              <Feather name={icon} size={22} color="#ffffff" />
            </View>
          ) : null}

          <View className="flex-1">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="text-2xl font-bold tracking-tight text-white">
                {title}
              </Text>
              {badge ? (
                <View className="rounded-full border border-blue-400/30 bg-blue-500/20 px-2.5 py-0.5">
                  <Text className="text-[11px] font-semibold text-blue-200">
                    {badge}
                  </Text>
                </View>
              ) : null}
            </View>
            {subtitle ? (
              <Text className="mt-1 text-xs text-slate-300">{subtitle}</Text>
            ) : null}
          </View>

          {right ? (
            <View className="flex-row items-center gap-2">{right}</View>
          ) : null}
        </View>

        {children}
      </View>
    </LinearGradient>
  );
}

/** Frosted icon button for header actions (refresh, edit, delete…). */
export function HeaderAction({
  icon,
  onPress,
  color = '#ffffff',
  disabled,
}: {
  icon: FeatherName;
  onPress?: () => void;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      hitSlop={8}
      disabled={disabled}
      onPress={onPress}
      className="h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 active:opacity-80"
    >
      <Feather name={icon} size={18} color={color} />
    </Pressable>
  );
}
