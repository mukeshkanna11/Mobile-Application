import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import ClientForm from '@/components/forms/ClientForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  fetchClient,
  toClientInput,
  updateClient,
  type ClientInput,
} from '@/services/clients';

export default function EditClientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initial, setInitial] = useState<ClientInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(false);
      setLoading(true);
      const client = await fetchClient(id);
      setInitial(toClientInput(client));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdate = async (input: ClientInput) => {
    await updateClient(id!, input);
    Toast.show({ type: 'success', text1: 'Client updated' });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="edit-2"
        title="Edit Client"
        subtitle="Update client information"
      />
      {loading ? (
        <LoadingState label="Loading client…" />
      ) : error || !initial ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load client"
          actionLabel="Retry"
          onAction={load}
        />
      ) : (
        <ClientForm
          initial={initial}
          submitLabel="Update Client"
          onSubmit={handleUpdate}
        />
      )}
    </SafeAreaView>
  );
}
