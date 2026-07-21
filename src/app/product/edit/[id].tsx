import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import ProductForm from '@/components/forms/ProductForm';
import EnterpriseHeader from '@/components/ui/EnterpriseHeader';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  fetchProduct,
  toProductInput,
  updateProduct,
  type ProductInput,
} from '@/services/products';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initial, setInitial] = useState<ProductInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(false);
      setLoading(true);
      const product = await fetchProduct(id);
      setInitial(toProductInput(product));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdate = async (input: ProductInput) => {
    await updateProduct(id!, input);
    Toast.show({ type: 'success', text1: 'Product updated' });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        icon="edit-2"
        title="Edit Product"
        subtitle="Update product details"
      />
      {loading ? (
        <LoadingState label="Loading product…" />
      ) : error || !initial ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load product"
          actionLabel="Retry"
          onAction={load}
        />
      ) : (
        <ProductForm
          initial={initial}
          submitLabel="Update Product"
          onSubmit={handleUpdate}
        />
      )}
    </SafeAreaView>
  );
}
