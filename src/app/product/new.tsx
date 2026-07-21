import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import ProductForm from '@/components/forms/ProductForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { createProduct, type ProductInput } from '@/services/products';

export default function NewProductScreen() {
  const handleCreate = async (input: ProductInput) => {
    await createProduct(input);
    Toast.show({ type: 'success', text1: 'Product created' });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="plus"
        title="New Product"
        subtitle="Add a product to your catalog"
      />
      <ProductForm submitLabel="Create Product" onSubmit={handleCreate} />
    </SafeAreaView>
  );
}
