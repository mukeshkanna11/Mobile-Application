import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import UserForm from '@/components/forms/UserForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  fetchUser,
  toUserInput,
  updateUser,
  type UserInput,
} from '@/services/users';

export default function EditUserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initial, setInitial] = useState<UserInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
      setInitial(toUserInput(found));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdate = async (values: UserInput) => {
    await updateUser(id!, values);
    Toast.show({ type: 'success', text1: 'User updated successfully' });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="edit-2"
        title="Update User"
        subtitle="Manage user access, roles and security permissions"
      />
      {loading ? (
        <LoadingState label="Loading user…" />
      ) : error || !initial ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load user"
          actionLabel="Retry"
          onAction={load}
        />
      ) : (
        <UserForm
          initial={initial}
          isEdit
          submitLabel="Update User"
          onSubmit={handleUpdate}
        />
      )}
    </SafeAreaView>
  );
}
