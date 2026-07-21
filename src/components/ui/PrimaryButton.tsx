import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
} from 'react-native';

interface PrimaryButtonProps extends PressableProps {
  label: string;
  loading?: boolean;
  loadingLabel?: string;
}

/**
 * Gradient CTA button (indigo → purple) with a built-in loading spinner,
 * matching the web dashboard's primary action style.
 */
export default function PrimaryButton({
  label,
  loading = false,
  loadingLabel = 'Please wait…',
  disabled,
  ...rest
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable disabled={isDisabled} {...rest}>
      {({ pressed }) => (
        <LinearGradient
          colors={['#4f46e5', '#9333ea']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            borderRadius: 14,
            opacity: isDisabled ? 0.7 : pressed ? 0.92 : 1,
            transform: [{ scale: pressed && !isDisabled ? 0.99 : 1 }],
          }}
        >
          <View className="flex-row items-center justify-center gap-2 py-4">
            {loading ? (
              <>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text className="text-base font-semibold text-white">
                  {loadingLabel}
                </Text>
              </>
            ) : (
              <>
                <Text className="text-base font-semibold text-white">
                  {label}
                </Text>
                <Feather name="arrow-right" size={18} color="#ffffff" />
              </>
            )}
          </View>
        </LinearGradient>
      )}
    </Pressable>
  );
}
