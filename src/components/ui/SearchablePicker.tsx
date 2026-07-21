import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';

export interface PickerOption {
  label: string;
  sublabel?: string;
  value: string;
}

/**
 * Labeled field that opens a searchable modal list — the mobile replacement for
 * a web <select> with many options (e.g. customer selection).
 */
export default function SearchablePicker({
  label,
  required,
  placeholder = 'Select…',
  value,
  options,
  onSelect,
  searchPlaceholder = 'Search…',
}: {
  label: string;
  required?: boolean;
  placeholder?: string;
  value?: string;
  options: PickerOption[];
  onSelect: (value: string) => void;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      `${o.label} ${o.sublabel ?? ''}`.toLowerCase().includes(q)
    );
  }, [options, query]);

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-slate-700">
        {label}
        {required ? <Text className="text-red-500"> *</Text> : null}
      </Text>

      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3"
      >
        <Text
          className={`flex-1 text-base ${selected ? 'text-slate-800' : 'text-slate-400'}`}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Feather name="chevron-down" size={18} color="#6366f1" />
      </Pressable>

      <Modal visible={open} transparent animationType="slide">
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setOpen(false)}
        >
          <Pressable
            className="h-[70%] rounded-t-3xl bg-white p-4"
            onPress={() => {}}
          >
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-slate-900">{label}</Text>
              <Pressable hitSlop={10} onPress={() => setOpen(false)}>
                <Feather name="x" size={22} color="#334155" />
              </Pressable>
            </View>

            <View className="mb-3 flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
              <Feather name="search" size={18} color="#94a3b8" />
              <TextInput
                className="flex-1 py-2.5 pl-2 text-base text-slate-800"
                placeholder={searchPlaceholder}
                placeholderTextColor="#94a3b8"
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                autoFocus
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(o) => o.value}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <Pressable
                    onPress={() => {
                      onSelect(item.value);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={`mb-2 flex-row items-center justify-between rounded-xl border p-3 ${
                      active ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-white'
                    }`}
                  >
                    <View className="flex-1 pr-2">
                      <Text className="font-medium text-slate-800" numberOfLines={1}>
                        {item.label}
                      </Text>
                      {item.sublabel ? (
                        <Text className="text-xs text-slate-500" numberOfLines={1}>
                          {item.sublabel}
                        </Text>
                      ) : null}
                    </View>
                    {active ? <Feather name="check" size={18} color="#4f46e5" /> : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text className="py-8 text-center text-sm text-slate-400">
                  No matches
                </Text>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
