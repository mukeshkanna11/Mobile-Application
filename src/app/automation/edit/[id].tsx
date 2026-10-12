import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import AutomationForm from '@/components/forms/AutomationForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  automationError,
  fetchAutomation,
  toAutomationInput,
  updateAutomation,
  type AutomationInput,
} from '@/services/automations';
import { goBackOr } from '@/utils/nav';

export default function EditAutomationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initial, setInitial] = useState<AutomationInput | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    fetchAutomation(id)
      .then((a) => {
        if (a) setInitial(toAutomationInput(a));
        else setError('Automation not found');
      })
      .catch((err) => setError(automationError(err)))
      .finally(() => setLoading(false));
  }, [id, reloadKey]);

  const handleUpdate = async (input: AutomationInput) => {
    await updateAutomation(id!, input);
    Toast.show({ type: 'success', text1: 'Automation updated' });
    goBackOr({ pathname: '/automation/[id]', params: { id: id! } });
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader onBack icon="edit-2" title="Edit Automation" badge="CRM Automation" subtitle="Update trigger, conditions and actions" />
      {loading ? (
        <LoadingState label="Loading automation…" />
      ) : error || !initial ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load automation"
          message={error || undefined}
          actionLabel="Retry"
          onAction={() => {
            setError('');
            setLoading(true);
            setReloadKey((k) => k + 1);
          }}
        />
      ) : (
        <AutomationForm initial={initial} submitLabel="Save Changes" onSubmit={handleUpdate} />
      )}
    </SafeAreaView>
  );
}
