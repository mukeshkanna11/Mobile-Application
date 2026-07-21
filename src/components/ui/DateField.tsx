import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';

/**
 * Labeled date field. Value/onChange use an ISO `YYYY-MM-DD` string (the format
 * the web form and backend expect). Android shows the native dialog; iOS uses a
 * bottom modal with a Done button.
 */
export default function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
}) {
  const [show, setShow] = useState(false);
  const dateValue = value ? new Date(value) : new Date();

  const commit = (d?: Date) => {
    if (d) onChange(d.toISOString().split('T')[0]);
  };

  const display = value ? new Date(value).toLocaleDateString() : 'Select date';

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-slate-700">{label}</Text>
      <Pressable
        onPress={() => setShow(true)}
        className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3"
      >
        <Text className="text-base text-slate-800">{display}</Text>
        <Feather name="calendar" size={18} color="#6366f1" />
      </Pressable>

      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          onChange={(_e, d) => {
            setShow(false);
            commit(d);
          }}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide">
          <Pressable
            className="flex-1 justify-end bg-black/40"
            onPress={() => setShow(false)}
          >
            <Pressable className="rounded-t-3xl bg-white p-4" onPress={() => {}}>
              <View className="mb-2 flex-row justify-end">
                <Pressable onPress={() => setShow(false)} className="px-4 py-2">
                  <Text className="text-base font-semibold text-indigo-600">Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={dateValue}
                mode="date"
                display="spinner"
                onChange={(_e, d) => commit(d)}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}
