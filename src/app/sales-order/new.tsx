import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import SalesOrderForm from '@/components/forms/SalesOrderForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { createSalesOrder, type SOInput } from '@/services/salesOrders';
import { goBackOr } from '@/utils/nav';

export default function NewSalesOrderScreen() {
  const handleCreate = async (input: SOInput) => {
    await createSalesOrder(input);
    Toast.show({ type: 'success', text1: 'Sales order created successfully' });
    goBackOr('/sales-orders');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader onBack icon="plus" title="New Sales Order" subtitle="Create a customer order" />
      <SalesOrderForm submitLabel="Create Sales Order" onSubmit={handleCreate} />
    </SafeAreaView>
  );
}
