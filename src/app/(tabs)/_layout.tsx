import { Stack } from 'expo-router';

/* No bottom tab bar: the same routes (/dashboard, /clients, /leads, /products,
   /users, /invoices, /more) are stacked screens reached from the full-screen
   Menu (/more). Dashboard stays the landing screen. */
export const unstable_settings = { initialRouteName: 'dashboard' };

export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="dashboard" options={{ animation: 'fade' }} />
      <Stack.Screen name="clients" />
      <Stack.Screen name="leads" />
      <Stack.Screen name="products" />
      <Stack.Screen name="users" />
      <Stack.Screen name="invoices" />
      <Stack.Screen name="more" />
    </Stack>
  );
}
