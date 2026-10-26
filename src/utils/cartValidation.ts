import type { CartItem } from '../types.js';

export function isPositiveQuantity(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export function sanitizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is CartItem => {
    const product = item?.product;
    return typeof item?.id === 'string' && typeof product?.id === 'string'
      && isPositiveQuantity(item.quantity) && isPositiveQuantity(product.stock)
      && typeof product.price === 'number' && Number.isFinite(product.price) && product.price >= 0;
  }).map((item) => ({ ...item, quantity: Math.min(item.quantity, item.product.stock) }));
}
