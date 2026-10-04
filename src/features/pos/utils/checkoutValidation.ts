import type { Product } from '../types/pos.types';

export const isValidCheckoutProduct = (product: Pick<Product, 'id' | 'kind'>) => {
  const s = String(product.id ?? '');
  return /^\d+$/.test(s) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
};
