import '@/global.css';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

SplashScreen.preventAutoHideAsync();

const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#4f46e5',
    secondary: '#9333ea',
  },
};

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="client/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="client/new" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen
            name="client/edit/[id]"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen name="lead/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="lead/new" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen
            name="lead/edit/[id]"
            options={{ animation: 'slide_from_right' }}
          />
        </Stack>
        <Toast />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
