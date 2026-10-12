import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import WarehouseForm from '@/components/forms/WarehouseForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  fetchWarehouse,
  toWarehouseInput,
  updateWarehouse,
  type WarehouseInput,
} from '@/services/warehouses';
import { goBackOr } from '@/utils/nav';

export default function EditWarehouseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initial, setInitial] = useState<WarehouseInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(false);
      setLoading(true);
      const w = await fetchWarehouse(id);
      setInitial(toWarehouseInput(w));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initial fetch without synchronous setState in the effect; Retry still uses load().
  useEffect(() => {
    if (!id) return;
    fetchWarehouse(id)
      .then((w) => setInitial(toWarehouseInput(w)))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdate = async (input: WarehouseInput) => {
    await updateWarehouse(id!, input);
    Toast.show({ type: 'success', text1: 'Warehouse updated successfully' });
    goBackOr('/warehouses');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="edit-2"
        title="Edit Warehouse"
        subtitle="Update warehouse details"
      />
      {loading ? (
        <LoadingState label="Loading warehouse…" />
      ) : error || !initial ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load warehouse"
          actionLabel="Retry"
          onAction={load}
        />
      ) : (
        <WarehouseForm
          initial={initial}
          submitLabel="Update Warehouse"
          onSubmit={handleUpdate}
        />
      )}
    </SafeAreaView>
  );
}
