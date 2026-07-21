import { LinearGradient } from 'expo-linear-gradient';
import { View, type ViewProps } from 'react-native';

/**
 * Full-screen enterprise backdrop: indigo → slate → purple diagonal gradient
 * with two soft glow blobs, matching the web login page.
 */
export default function GradientBackground({
  children,
  style,
  ...rest
}: ViewProps) {
  return (
    <View className="flex-1 bg-slate-950" style={style} {...rest}>
      <LinearGradient
        colors={['#1e1b4b', '#020617', '#3b0764']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Glow blobs */}
      <View className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-indigo-500/20" />
      <View className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-purple-500/20" />

      <View className="flex-1">{children}</View>
    </View>
  );
}
