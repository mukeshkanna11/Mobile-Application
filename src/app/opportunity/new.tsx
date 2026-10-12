import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import OpportunityForm from '@/components/forms/OpportunityForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { createOpportunity, type OpportunityInput } from '@/services/opportunities';
import { goBackOr } from '@/utils/nav';

export default function NewOpportunityScreen() {
  const handleCreate = async (input: OpportunityInput) => {
    await createOpportunity(input);
    Toast.show({ type: 'success', text1: 'Opportunity created successfully' });
    goBackOr('/opportunities');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="plus"
        title="New Opportunity"
        subtitle="Add a deal to your pipeline"
      />
      <OpportunityForm submitLabel="Create Opportunity" onSubmit={handleCreate} />
    </SafeAreaView>
  );
}
