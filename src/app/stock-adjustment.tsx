import { SafeAreaView } from 'react-native-safe-area-context';

import StockMovementForm from '@/components/forms/StockMovementForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';

export default function StockAdjustmentScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader onBack icon="sliders" title="Stock Adjustment" badge="ERP" subtitle="Correct stock with a reason" />
      <StockMovementForm mode="adjust" />
    </SafeAreaView>
  );
}
