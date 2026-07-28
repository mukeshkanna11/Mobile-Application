import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import WarehouseForm from '@/components/forms/WarehouseForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { createWarehouse, type WarehouseInput } from '@/services/warehouses';

export default function NewWarehouseScreen() {
  const handleCreate = async (input: WarehouseInput) => {
    await createWarehouse(input);
    Toast.show({ type: 'success', text1: 'Warehouse created successfully' });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="plus"
        title="New Warehouse"
        subtitle="Add a storage site"
      />
      <WarehouseForm submitLabel="Create Warehouse" onSubmit={handleCreate} />
    </SafeAreaView>
  );
}
