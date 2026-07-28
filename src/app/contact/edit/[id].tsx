import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import ContactForm, { type ContactFormValues } from '@/components/forms/ContactForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import API from '@/services/api';

export default function EditContactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initial, setInitial] = useState<ContactFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(false);
      setLoading(true);
      const { data } = await API.get(`/clients/${id}`);
      const c = (data?.data ?? data) as any;
      setInitial({
        name: c.contactPerson || c.companyName || '',
        company: c.companyName || '',
        email: c.email || '',
        phone: c.phone || '',
        notes: c.notes || '',
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdate = async (values: ContactFormValues) => {
    await API.put(`/clients/${id}`, {
      contactPerson: values.name.trim(),
      companyName: values.company.trim() || values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      notes: values.notes.trim(),
    });
    Toast.show({ type: 'success', text1: 'Contact updated' });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="edit-2"
        title="Edit Contact"
        subtitle="Update contact details"
      />
      {loading ? (
        <LoadingState label="Loading contact…" />
      ) : error || !initial ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load contact"
          actionLabel="Retry"
          onAction={load}
        />
      ) : (
        <ContactForm
          initial={initial}
          submitLabel="Update Contact"
          onSubmit={handleUpdate}
        />
      )}
    </SafeAreaView>
  );
}
