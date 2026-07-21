import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

type FeatherName = keyof typeof Feather.glyphMap;

interface InputFieldProps extends TextInputProps {
  label: string;
  icon: FeatherName;
  /** Renders a show/hide eye toggle and masks the value. */
  secure?: boolean;
  disabled?: boolean;
}

/**
 * Labeled text input with a leading icon, rounded card styling and an optional
 * password visibility toggle. Reused for every field on the login card.
 */
export default function InputField({
  label,
  icon,
  secure = false,
  disabled = false,
  ...rest
}: InputFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View>
      <Text className="mb-2 text-sm font-medium text-slate-700">{label}</Text>

      <View
        className={`flex-row items-center rounded-xl border border-slate-200 px-4 ${
          disabled ? 'bg-slate-100' : 'bg-white'
        }`}
      >
        <Feather name={icon} size={18} color="#6366f1" />

        <TextInput
          className="flex-1 py-3 pl-3 text-base text-slate-800"
          placeholderTextColor="#94a3b8"
          editable={!disabled}
          secureTextEntry={secure && !visible}
          autoCapitalize="none"
          autoCorrect={false}
          {...rest}
        />

        {secure && (
          <Pressable
            hitSlop={10}
            onPress={() => setVisible((v) => !v)}
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          >
            <Feather
              name={visible ? 'eye-off' : 'eye'}
              size={18}
              color="#64748b"
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}
