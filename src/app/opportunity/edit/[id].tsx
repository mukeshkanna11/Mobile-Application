import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import OpportunityForm from '@/components/forms/OpportunityForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  fetchOpportunity,
  toOpportunityInput,
  updateOpportunity,
  type OpportunityInput,
} from '@/services/opportunities';

export default function EditOpportunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initial, setInitial] = useState<OpportunityInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(false);
      setLoading(true);
      const op = await fetchOpportunity(id);
      setInitial(toOpportunityInput(op));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdate = async (input: OpportunityInput) => {
    await updateOpportunity(id!, input);
    Toast.show({ type: 'success', text1: 'Opportunity updated successfully' });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="edit-2"
        title="Edit Opportunity"
        subtitle="Update deal details"
      />
      {loading ? (
        <LoadingState label="Loading opportunity…" />
      ) : error || !initial ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load opportunity"
          actionLabel="Retry"
          onAction={load}
        />
      ) : (
        <OpportunityForm
          initial={initial}
          submitLabel="Update Opportunity"
          onSubmit={handleUpdate}
        />
      )}
    </SafeAreaView>
  );
}
