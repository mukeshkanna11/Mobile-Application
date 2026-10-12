import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { DetailRow, Section } from '@/components/ui/DetailSection';
import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  deleteUser,
  fetchUser,
  formatDate,
  roleStyle,
  type User,
} from '@/services/users';
import { goBackOr } from '@/utils/nav';

export default function UserDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(false);
      setLoading(true);
      const found = await fetchUser(id);
      if (!found) {
        setError(true);
        return;
      }
      setUser(found);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openUrl = (url: string) =>
    Linking.openURL(url).catch(() =>
      Toast.show({ type: 'error', text1: 'Unable to open' })
    );

  const confirmDelete = () => {
    Alert.alert('Remove this user?', `Remove “${user?.name}” permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          try {
            setDeleting(true);
            await deleteUser(id);
            Toast.show({ type: 'success', text1: 'User removed' });
            goBackOr('/users');
          } catch (err: any) {
            setDeleting(false);
            Toast.show({
              type: 'error',
              text1: 'Delete failed',
              text2: err?.response?.data?.message ?? 'Please try again.',
            });
          }
        },
      },
    ]);
  };

  const active = user?.isActive !== false;
  const [roleBg, roleText] = roleStyle(user?.role).split(' ');

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        title="User"
        badge="ReadyTech Solutions"
        right={
          user ? (
            <>
              <HeaderAction
                icon="edit-2"
                onPress={() =>
                  router.push({
                    pathname: '/user/edit/[id]',
                    params: { id: user._id },
                  })
                }
              />
              <HeaderAction
                icon="trash-2"
                color="#fca5a5"
                disabled={deleting}
                onPress={confirmDelete}
              />
            </>
          ) : undefined
        }
      >
        {user ? (
          <View className="mt-4 flex-row items-center gap-4">
            <View className="h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10">
              <Text className="text-2xl font-black text-white">
                {(user.name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-white" numberOfLines={1}>
                {user.name}
              </Text>
              <Text className="text-xs text-slate-300" numberOfLines={1}>
                {user.email}
              </Text>
            </View>
          </View>
        ) : null}
      </EnterpriseHeader>

      {loading ? (
        <LoadingState label="Loading user…" />
      ) : error || !user ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load user"
          message="This user may have been removed."
          actionLabel="Retry"
          onAction={load}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Role + status chips */}
          <View className="flex-row items-center gap-2">
            <View className={`rounded-full px-3 py-1.5 ${roleBg}`}>
              <Text className={`text-xs font-semibold ${roleText}`}>
                {user.role}
              </Text>
            </View>
            <View
              className={`flex-row items-center gap-2 rounded-full px-3 py-1.5 ${
                active ? 'bg-green-100' : 'bg-red-100'
              }`}
            >
              <View
                className={`h-2 w-2 rounded-full ${
                  active ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <Text
                className={`text-xs font-semibold ${
                  active ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          <Section title="Account Information">
            <DetailRow
              icon="mail"
              label="Email"
              value={user.email}
              onPress={
                user.email ? () => openUrl(`mailto:${user.email}`) : undefined
              }
            />
          </Section>

          <Section title="Employment Details">
            <DetailRow icon="briefcase" label="Department" value={user.department} />
            <DetailRow icon="award" label="Designation" value={user.designation} />
            <DetailRow
              icon="home"
              label="Company"
              value={user.company ?? undefined}
            />
            <DetailRow
              icon="hash"
              label="Employee ID"
              value={user.employeeId ?? undefined}
            />
            <DetailRow
              icon="calendar"
              label="Joining Date"
              value={user.joiningDate ? formatDate(user.joiningDate) : undefined}
            />
          </Section>

          <Section title="Access & Security">
            <DetailRow icon="shield" label="Role" value={user.role} />
            <DetailRow
              icon="activity"
              label="Status"
              value={active ? 'Active' : 'Inactive'}
            />
            <DetailRow
              icon="log-in"
              label="Last Login"
              value={user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
            />
          </Section>

          <Section title="Timeline">
            <DetailRow
              icon="calendar"
              label="Created Date"
              value={formatDate(user.createdAt)}
            />
            <DetailRow
              icon="clock"
              label="Last Updated"
              value={formatDate(user.updatedAt)}
            />
          </Section>

          <View className="mt-4 flex-row items-start gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <Feather name="lock" size={14} color="#4338ca" />
            <Text className="flex-1 text-xs leading-relaxed text-indigo-700">
              User credentials are securely managed under ReadyTech Solutions
              enterprise access policy.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
