import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import ClientForm from '@/components/forms/ClientForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { createClient, type ClientInput } from '@/services/clients';

export default function NewClientScreen() {
  const handleCreate = async (input: ClientInput) => {
    await createClient(input);
    Toast.show({ type: 'success', text1: 'Client created' });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="user-plus"
        title="Add Client"
        subtitle="Create a new client record"
      />
      <ClientForm submitLabel="Create Client" onSubmit={handleCreate} />
    </SafeAreaView>
  );
}
