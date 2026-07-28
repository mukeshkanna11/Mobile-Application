import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  Card,
  FAB,
  Searchbar,
  Text,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import API from '@/services/api';

interface Contact {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
}

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const data = (payload as { data?: unknown })?.data;
  return Array.isArray(data) ? (data as T[]) : [];
}

function initials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '?'
  );
}

export default function ContactsScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await API.get('/clients');
      const list = asArray<any>(data).map((c) => ({
        _id: c._id,
        name: c.companyName || c.contactPerson || 'Unnamed',
        email: c.email,
        phone: c.phone,
      }));
      setContacts(list);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      `${c.name} ${c.email ?? ''} ${c.phone ?? ''}`.toLowerCase().includes(q)
    );
  }, [contacts, query]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="px-5 pb-2 pt-2">
        <Text variant="headlineSmall" className="font-bold text-slate-900">
          Contacts
        </Text>
        <Searchbar
          placeholder="Search contacts…"
          value={query}
          onChangeText={setQuery}
          className="mt-3"
          style={{ borderRadius: 16, backgroundColor: '#ffffff' }}
          elevation={1}
        />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text className="mt-3 text-sm text-slate-400">Loading contacts…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 96,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => (
            <Card
              mode="elevated"
              style={{ marginBottom: 12, borderRadius: 20, backgroundColor: '#ffffff' }}
            >
              <Card.Title
                title={item.name}
                titleStyle={{ fontWeight: '700', color: '#0f172a' }}
                subtitle={item.email || item.phone || 'No contact info'}
                subtitleStyle={{ color: '#64748b' }}
                left={(props) => (
                  <Avatar.Text
                    {...props}
                    label={initials(item.name)}
                    style={{ backgroundColor: '#4f46e5' }}
                    color="#ffffff"
                  />
                )}
              />
            </Card>
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8 py-24">
              <Avatar.Icon
                size={64}
                icon="account-multiple-outline"
                style={{ backgroundColor: '#e2e8f0' }}
                color="#94a3b8"
              />
              <Text className="mt-4 text-lg font-semibold text-slate-900">
                {query ? 'No matches' : 'No contacts yet'}
              </Text>
              <Text className="mt-1 text-center text-sm text-slate-400">
                {query
                  ? 'Try a different search.'
                  : 'Add your first contact to get started.'}
              </Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        onPress={() => router.push('/client/new')}
        style={{
          position: 'absolute',
          right: 20,
          bottom: 24,
          borderRadius: 28,
          backgroundColor: '#4f46e5',
        }}
        color="#ffffff"
      />
    </SafeAreaView>
  );
}
