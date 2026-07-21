import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import LeadForm from '@/components/forms/LeadForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  fetchLead,
  toLeadInput,
  updateLead,
  type LeadInput,
} from '@/services/leads';

export default function EditLeadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initial, setInitial] = useState<LeadInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(false);
      setLoading(true);
      const lead = await fetchLead(id);
      setInitial(toLeadInput(lead));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdate = async (input: LeadInput) => {
    await updateLead(id!, input);
    Toast.show({ type: 'success', text1: 'Lead updated' });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="edit-2"
        title="Edit Lead"
        subtitle="Update this lead's details"
      />
      {loading ? (
        <LoadingState label="Loading lead…" />
      ) : error || !initial ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load lead"
          actionLabel="Retry"
          onAction={load}
        />
      ) : (
        <LeadForm
          initial={initial}
          submitLabel="Update Lead"
          onSubmit={handleUpdate}
        />
      )}
    </SafeAreaView>
  );
}
