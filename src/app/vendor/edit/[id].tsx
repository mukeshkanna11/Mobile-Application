import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import VendorForm from '@/components/forms/VendorForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  fetchVendor,
  toVendorInput,
  updateVendor,
  type VendorInput,
} from '@/services/vendors';
import { goBackOr } from '@/utils/nav';

export default function EditVendorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initial, setInitial] = useState<VendorInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(false);
      setLoading(true);
      setInitial(toVendorInput(await fetchVendor(id)));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchVendor(id)
      .then((v) => setInitial(toVendorInput(v)))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdate = async (input: VendorInput) => {
    await updateVendor(id!, input);
    Toast.show({ type: 'success', text1: 'Vendor updated' });
    goBackOr('/vendors');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader onBack icon="edit-2" title="Edit Vendor" subtitle="Update vendor details" />
      {loading ? (
        <LoadingState label="Loading vendor…" />
      ) : error || !initial ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load vendor"
          actionLabel="Retry"
          onAction={load}
        />
      ) : (
        <VendorForm initial={initial} submitLabel="Update Vendor" onSubmit={handleUpdate} />
      )}
    </SafeAreaView>
  );
}
