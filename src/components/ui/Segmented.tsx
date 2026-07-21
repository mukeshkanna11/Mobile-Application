import { Pressable, ScrollView, Text, View } from 'react-native';

interface SegmentedProps<T extends string> {
  label?: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  /** Horizontal scroll when there are many options. */
  scroll?: boolean;
}

/**
 * Chip-style single-select, used for enum fields (status, type) and list
 * filters — the mobile equivalent of the web <select> dropdowns.
 */
export default function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  scroll = false,
}: SegmentedProps<T>) {
  const chips = options.map((opt) => {
    const active = opt === value;
    return (
      <Pressable
        key={opt}
        onPress={() => onChange(opt)}
        className={`mr-2 rounded-full border px-4 py-2 ${
          active
            ? 'border-indigo-600 bg-indigo-600'
            : 'border-slate-200 bg-white'
        }`}
      >
        <Text
          className={`text-sm font-medium ${
            active ? 'text-white' : 'text-slate-600'
          }`}
        >
          {opt}
        </Text>
      </Pressable>
    );
  });

  return (
    <View className="mb-4">
      {label ? (
        <Text className="mb-1.5 text-sm font-medium text-slate-700">
          {label}
        </Text>
      ) : null}
      {scroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {chips}
        </ScrollView>
      ) : (
        <View className="flex-row flex-wrap gap-y-2">{chips}</View>
      )}
    </View>
  );
}
