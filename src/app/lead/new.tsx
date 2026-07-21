import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import LeadForm from '@/components/forms/LeadForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { createLead, type LeadInput } from '@/services/leads';

export default function NewLeadScreen() {
  const handleCreate = async (input: LeadInput) => {
    await createLead(input);
    Toast.show({ type: 'success', text1: 'Lead created' });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="user-plus"
        title="New Lead"
        subtitle="Add a new lead to your pipeline"
      />
      <LeadForm submitLabel="Create Lead" onSubmit={handleCreate} />
    </SafeAreaView>
  );
}
