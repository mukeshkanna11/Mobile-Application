import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import type { ComponentProps } from 'react';

type FeatherName = ComponentProps<typeof Feather>['name'];

interface QuickActionProps {
  label: string;
  icon: FeatherName;
  color: string;
  onPress?: () => void;
}


/**
 * Dashboard Quick Action Button
 * 
 * Examples:
 * Add Client
 * New Invoice
 * Add Product
 * Stock In
 */
export default function QuickAction({
  label,
  icon,
  color,
  onPress,
}: QuickActionProps) {

  return (

    <Pressable

      onPress={onPress}

      className="items-center flex-1 p-4 bg-white border  rounded-2xl border-slate-100 active:opacity-80"

    >


      {/* ICON */}

      <View

        className="items-center justify-center rounded-full  h-11 w-11"

        style={{
          backgroundColor: `${color}1A`,
        }}

      >

        <Feather

          name={icon}

          size={20}

          color={color}

        />

      </View>




      {/* LABEL */}

      <Text

        className="mt-2 text-xs font-medium text-center  text-slate-700"

      >

        {label}

      </Text>


    </Pressable>

  );

}