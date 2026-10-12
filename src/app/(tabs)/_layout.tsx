import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

type FeatherName = keyof typeof Feather.glyphMap;

const tabIcon = (name: FeatherName) => {
  const TabIcon = ({ color, size }: { color: ColorValue; size: number }) => (
    <Feather name={name} size={size} color={color} />
  );
  TabIcon.displayName = `TabIcon(${name})`;
  return TabIcon;
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarStyle: {
          borderTopColor: '#e2e8f0',
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Dashboard', tabBarIcon: tabIcon('grid') }}
      />
      <Tabs.Screen
        name="clients"
        options={{ title: 'Clients', tabBarIcon: tabIcon('users') }}
      />
      <Tabs.Screen
        name="leads"
        options={{ title: 'Leads', tabBarIcon: tabIcon('target') }}
      />
      <Tabs.Screen
        name="products"
        options={{ title: 'Products', tabBarIcon: tabIcon('package') }}
      />
      {/* Hidden from the tab bar (href: null) but still routable as /users; opened from More. */}
      <Tabs.Screen
        name="users"
        options={{ title: 'Users', tabBarIcon: tabIcon('user-check'), href: null }}
      />
      {/* Hidden from the tab bar (href: null) but still routable as /invoices; opened from More. */}
      <Tabs.Screen
        name="invoices"
        options={{ title: 'Invoices', tabBarIcon: tabIcon('file-text'), href: null }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: 'More', tabBarIcon: tabIcon('grid') }}
      />

    </Tabs>
  );
}
