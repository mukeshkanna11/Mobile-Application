import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import SalesOrderForm from '@/components/forms/SalesOrderForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  canEdit,
  fetchSalesOrder,
  STATUS_LABEL,
  toSOInput,
  updateSalesOrder,
  type SOInput,
} from '@/services/salesOrders';
import { goBackOr } from '@/utils/nav';

export default function EditSalesOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initial, setInitial] = useState<SOInput | null>(null);
  const [lockedStatus, setLockedStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    fetchSalesOrder(id)
      .then((so) => {
        setError(false);
        // Backend only allows editing DRAFT orders.
        if (canEdit(so.status)) setInitial(toSOInput(so));
        else setLockedStatus(STATUS_LABEL[so.status] ?? so.status);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id, reloadKey]);

  const handleUpdate = async (input: SOInput) => {
    await updateSalesOrder(id!, input);
    Toast.show({ type: 'success', text1: 'Sales order updated successfully' });
    goBackOr('/sales-orders');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader onBack icon="edit-2" title="Edit Sales Order" subtitle="Update draft order" />
      {loading ? (
        <LoadingState label="Loading sales order…" />
      ) : lockedStatus ? (
        <MessageState
          icon="lock"
          title="Order can't be edited"
          message={`Only draft orders can be edited. This order is ${lockedStatus}.`}
        />
      ) : error || !initial ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load sales order"
          actionLabel="Retry"
          onAction={() => {
            setLoading(true);
            setReloadKey((k) => k + 1);
          }}
        />
      ) : (
        <SalesOrderForm initial={initial} submitLabel="Update Sales Order" onSubmit={handleUpdate} />
      )}
    </SafeAreaView>
  );
}
