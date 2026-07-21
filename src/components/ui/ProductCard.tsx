import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import Badge from '@/components/ui/Badge';
import ProductThumb from '@/components/ui/ProductThumb';
import { stockLevel, type Product } from '@/services/products';

/**
 * Mobile product card — replaces a web table row. Shows image, name, SKU,
 * category, price, current stock and an Active/Inactive status badge.
 */
export default function ProductCard({
  product,
  onPress,
}: {
  product: Product;
  onPress?: () => void;
}) {
  const stock = Number(product.stock) || 0;
  const lowOrOut = stock <= 5;
  const isActive = (product.status || 'Active') === 'Active';

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
    >
      <View className="flex-row items-center gap-3">
        <ProductThumb product={product} size={52} radius={16} />

        <View className="flex-1">
          <Text
            className="text-base font-semibold text-slate-900"
            numberOfLines={1}
          >
            {product.name}
          </Text>
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            SKU: {product.sku || '—'}
          </Text>
          <View className="mt-1 flex-row items-center gap-2">
            <View className="rounded-full bg-indigo-50 px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-indigo-700">
                {product.category || 'General'}
              </Text>
            </View>
          </View>
        </View>

        <View className="items-end">
          <Text className="text-base font-bold text-slate-900">
            ₹{Number(product.price || 0).toLocaleString()}
          </Text>
          <Feather name="chevron-right" size={18} color="#cbd5e1" />
        </View>
      </View>

      {/* Meta row */}
      <View className="mt-3 flex-row items-center gap-2">
        <Badge
          label={`${stock} Units`}
          bg={lowOrOut ? 'bg-red-100' : 'bg-emerald-100'}
          text={lowOrOut ? 'text-red-700' : 'text-emerald-700'}
        />
        <Badge
          label={stockLevel(product.stock)}
          bg="bg-slate-100"
          text="text-slate-600"
        />
        <View className="ml-auto">
          <Badge
            label={isActive ? 'Active' : 'Inactive'}
            bg={isActive ? 'bg-emerald-100' : 'bg-slate-200'}
            text={isActive ? 'text-emerald-700' : 'text-slate-600'}
            dot={isActive ? 'bg-emerald-500' : 'bg-slate-400'}
          />
        </View>
      </View>
    </Pressable>
  );
}
