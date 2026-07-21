import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native';

import type { Product } from '@/services/products';

/**
 * Product image with graceful fallback. The web/backend expose no image field,
 * so unless a product carries `image`/`imageUrl` we render a gradient initial
 * tile (matching the web's avatar treatment).
 */
export default function ProductThumb({
  product,
  size = 48,
  radius = 14,
}: {
  product: Pick<Product, 'name' | 'image' | 'imageUrl'>;
  size?: number;
  radius?: number;
}) {
  const uri = product.image || product.imageUrl;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
        transition={150}
      />
    );
  }

  return (
    <LinearGradient
      colors={['#6366f1', '#2563eb']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        className="font-bold text-white"
        style={{ fontSize: size * 0.4 }}
      >
        {(product.name || '?').charAt(0).toUpperCase()}
      </Text>
    </LinearGradient>
  );
}
