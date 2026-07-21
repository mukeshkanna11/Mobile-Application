import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface FormFieldProps extends TextInputProps {
  label: string;
  required?: boolean;
}

/**
 * Labeled text input used across the client create/edit form.
 */
export default function FormField({
  label,
  required = false,
  multiline,
  ...rest
}: FormFieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-slate-700">
        {label}
        {required ? <Text className="text-red-500"> *</Text> : null}
      </Text>
      <TextInput
        className={`rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-800 ${
          multiline ? 'py-3' : 'py-2.5'
        }`}
        placeholderTextColor="#94a3b8"
        multiline={multiline}
        style={multiline ? { minHeight: 96, textAlignVertical: 'top' } : undefined}
        {...rest}
      />
    </View>
  );
}
