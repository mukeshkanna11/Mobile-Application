import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import Badge from '@/components/ui/Badge';
import { DetailRow, Section } from '@/components/ui/DetailSection';
import EnterpriseHeader, { HeaderAction } from '@/components/ui/EnterpriseHeader';
import ProductThumb from '@/components/ui/ProductThumb';
import { LoadingState, MessageState } from '@/components/ui/StateView';
import {
  deleteProduct,
  fetchProduct,
  stockLevel,
  type Product,
} from '@/services/products';

function StatChip({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <Text className="text-xs text-slate-500">{label}</Text>
      <Text
        className={`mt-1 text-lg font-bold ${tone ?? 'text-slate-900'}`}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(false);
      setLoading(true);
      setProduct(await fetchProduct(id));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const confirmDelete = useCallback(() => {
    if (!id) return;
    Alert.alert(
      'Delete product',
      `Delete “${product?.name ?? 'this product'}” permanently?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteProduct(id);
              Toast.show({ type: 'success', text1: 'Product deleted' });
              router.back();
            } catch (err: any) {
              setDeleting(false);
              Toast.show({
                type: 'error',
                text1: 'Delete failed',
                text2: err?.response?.data?.message ?? 'Please try again.',
              });
            }
          },
        },
      ]
    );
  }, [id, product]);

  const stock = Number(product?.stock) || 0;
  const isActive = (product?.status || 'Active') === 'Active';

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <EnterpriseHeader
        onBack
        title="Product Details"
        badge="ReadyTech Solutions"
        right={
          product ? (
            <>
              <HeaderAction
                icon="edit-2"
                onPress={() =>
                  router.push({
                    pathname: '/product/edit/[id]',
                    params: { id: product._id },
                  })
                }
              />
              <HeaderAction
                icon="trash-2"
                color="#fecaca"
                disabled={deleting}
                onPress={confirmDelete}
              />
            </>
          ) : undefined
        }
      >
        {product ? (
          <View className="mt-4 flex-row items-center gap-4">
            <ProductThumb product={product} size={64} radius={18} />
            <View className="flex-1">
              <Text className="text-xl font-bold text-white" numberOfLines={2}>
                {product.name}
              </Text>
              <Text className="text-xs text-slate-300">
                SKU: {product.sku || '—'}
              </Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                <View className="rounded-full bg-indigo-500/20 px-2.5 py-1">
                  <Text className="text-xs font-medium text-indigo-100">
                    {product.category || 'General'}
                  </Text>
                </View>
                <View
                  className={`rounded-full px-2.5 py-1 ${
                    isActive ? 'bg-emerald-500/20' : 'bg-white/10'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      isActive ? 'text-emerald-200' : 'text-slate-200'
                    }`}
                  >
                    {product.status || 'Active'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}
      </EnterpriseHeader>

      {loading ? (
        <LoadingState label="Loading product…" />
      ) : error || !product ? (
        <MessageState
          icon="alert-triangle"
          tone="error"
          title="Couldn't load product"
          message="This product may have been removed."
          actionLabel="Retry"
          onAction={load}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick stats */}
          <View className="flex-row gap-3">
            <StatChip
              label="Price"
              value={`₹${Number(product.price || 0).toLocaleString()}`}
            />
            <StatChip
              label="Stock"
              value={`${stock}`}
              tone={stock <= 5 ? 'text-red-600' : 'text-emerald-600'}
            />
            <StatChip label="Tax" value={`${Number(product.tax) || 0}%`} />
          </View>

          <View className="mt-4 flex-row items-center gap-2">
            <Text className="text-xs text-slate-500">Availability:</Text>
            <Badge
              label={stockLevel(product.stock)}
              bg={stock <= 5 ? 'bg-red-100' : 'bg-emerald-100'}
              text={stock <= 5 ? 'text-red-700' : 'text-emerald-700'}
            />
          </View>

          <Section title="Product Information">
            <DetailRow icon="tag" label="Name" value={product.name} />
            <DetailRow icon="hash" label="SKU" value={product.sku} />
            <DetailRow
              icon="grid"
              label="Category"
              value={product.category || 'General'}
            />
            <DetailRow
              icon="dollar-sign"
              label="Price"
              value={`₹${Number(product.price || 0).toLocaleString()}`}
            />
            <DetailRow icon="box" label="Current Stock" value={`${stock} units`} />
            <DetailRow
              icon="activity"
              label="Status"
              value={product.status || 'Active'}
            />
            <DetailRow
              icon="calendar"
              label="Created"
              value={
                product.createdAt
                  ? new Date(product.createdAt).toLocaleString()
                  : undefined
              }
            />
          </Section>

          <Section title="Description">
            <Text className="pb-4 pt-1 text-sm leading-relaxed text-slate-700">
              {product.description || 'No description provided for this product.'}
            </Text>
          </Section>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
