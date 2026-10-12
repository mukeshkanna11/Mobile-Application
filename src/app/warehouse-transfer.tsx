import { SafeAreaView } from 'react-native-safe-area-context';

import StockMovementForm from '@/components/forms/StockMovementForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';

export default function WarehouseTransferScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader onBack icon="repeat" title="Warehouse Transfer" badge="ERP" subtitle="Move stock between warehouses" />
      <StockMovementForm mode="transfer" />
    </SafeAreaView>
  );
}
