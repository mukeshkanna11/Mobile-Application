import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import VendorForm from '@/components/forms/VendorForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { createVendor, type VendorInput } from '@/services/vendors';
import { goBackOr } from '@/utils/nav';

export default function NewVendorScreen() {
  const handleCreate = async (input: VendorInput) => {
    await createVendor(input);
    Toast.show({ type: 'success', text1: 'Vendor added' });
    goBackOr('/vendors');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader onBack icon="plus" title="New Vendor" subtitle="Add a supplier" />
      <VendorForm submitLabel="Add Vendor" onSubmit={handleCreate} />
    </SafeAreaView>
  );
}
