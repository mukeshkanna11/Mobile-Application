import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import ContactForm, { type ContactFormValues } from '@/components/forms/ContactForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import API from '@/services/api';

export default function NewContactScreen() {
  const handleCreate = async (values: ContactFormValues) => {
    await API.post('/clients', {
      contactPerson: values.name.trim(),
      companyName: values.company.trim() || values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      notes: values.notes.trim(),
    });
    Toast.show({ type: 'success', text1: 'Contact saved' });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="user-plus"
        title="New Contact"
        subtitle="Add a new contact"
      />
      <ContactForm submitLabel="Save Contact" onSubmit={handleCreate} />
    </SafeAreaView>
  );
}
