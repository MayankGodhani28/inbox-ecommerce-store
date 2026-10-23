/**
 * ─────────────────────────────────────────────────────
 *  LAYER 2B: INTEGRATION TESTS — Cart Service
 *  File: src/tests/integration/cartService.test.ts
 * ─────────────────────────────────────────────────────
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { cartService } from '../../services/cartService';
import { apiClient } from '../../services/apiClient';

const SAMPLE_PRODUCT = {
  id: 'prod-001',
  name: 'Sony WH-1000XM5',
  brand: 'Sony',
  category: 'Electronics' as const,
  description: 'Headphones',
  price: 24999,
  originalPrice: 34999,
  discount: 28,
  rating: 4.8,
  reviewCount: 100,
  stock: 10,
  images: [],
  specifications: {},
};

const SAMPLE_CART_ITEM = {
  id: 'cart-item-001',
  product: SAMPLE_PRODUCT,
  quantity: 2,
  selectedColor: 'Black',
  selectedSize: '',
};

// ═══════════════════════════════════════════════════════
//  TEST SUITE: Cart CRUD Operations
// ═══════════════════════════════════════════════════════
describe('cartService — Integration Tests', () => {
  afterEach(() => vi.clearAllMocks());

  it('should fetch the current cart with items and total count', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ items: [SAMPLE_CART_ITEM], totalCount: 2 });

    const cart = await cartService.getCart();

    expect(apiClient.get).toHaveBeenCalledWith('/api/cart');
    expect(cart.items).toHaveLength(1);
    expect(cart.totalCount).toBe(2);
    expect(cart.items[0].product.name).toBe('Sony WH-1000XM5');
  });

  it('should add a new item to the cart with all options', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ item: SAMPLE_CART_ITEM });

    const result = await cartService.addItem('prod-001', 2, 'Black', '');

    expect(apiClient.post).toHaveBeenCalledWith('/api/cart/items', {
      productId: 'prod-001',
      quantity: 2,
      selectedColor: 'Black',
      selectedSize: '',
    });
    expect(result.item.id).toBe('cart-item-001');
  });

  it('should add item with default quantity of 1 if not specified', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ item: { ...SAMPLE_CART_ITEM, quantity: 1 } });

    await cartService.addItem('prod-001');

    const callArgs = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, unknown>;
    expect(callArgs.quantity).toBe(1);
  });

  it('should update item quantity using PATCH', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ item: { ...SAMPLE_CART_ITEM, quantity: 5 } });

    await cartService.updateItemQuantity('cart-item-001', 5);

    expect(apiClient.patch).toHaveBeenCalledWith('/api/cart/items/cart-item-001', { quantity: 5 });
  });

  it('should remove a specific item from the cart', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce(undefined);

    await cartService.removeItem('cart-item-001');

    expect(apiClient.delete).toHaveBeenCalledWith('/api/cart/items/cart-item-001');
  });

  it('should clear all items from the cart', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce(undefined);

    await cartService.clearCart();

    expect(apiClient.delete).toHaveBeenCalledWith('/api/cart');
  });

  it('should merge a guest cart on login (items array sent to server)', async () => {
    const guestItems = [
      { productId: 'prod-001', quantity: 2, selectedColor: 'Black' },
      { productId: 'prod-002', quantity: 1 },
    ];
    vi.mocked(apiClient.post).mockResolvedValueOnce({ items: [SAMPLE_CART_ITEM] });

    const result = await cartService.mergeCart(guestItems);

    expect(apiClient.post).toHaveBeenCalledWith('/api/cart/merge', { items: guestItems });
    expect(result.items).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════
//  TEST SUITE: Saved / Wishlist Items
// ═══════════════════════════════════════════════════════
describe('cartService (saved items) — Integration Tests', () => {
  afterEach(() => vi.clearAllMocks());

  const SAVED_ITEM = {
    id: 'saved-001',
    product: SAMPLE_PRODUCT,
    savedAt: new Date().toISOString(),
  };

  it('should fetch saved items', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ items: [SAVED_ITEM] });

    const result = await cartService.getSavedItems();

    expect(apiClient.get).toHaveBeenCalledWith('/api/saved-items');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('saved-001');
  });

  it('should move an item from cart to saved list', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ item: SAVED_ITEM });

    await cartService.saveItem('prod-001', 'Black', '', true);

    expect(apiClient.post).toHaveBeenCalledWith('/api/saved-items', {
      productId: 'prod-001',
      selectedColor: 'Black',
      selectedSize: '',
      moveFromCart: true,
    });
  });

  it('should move a saved item back to cart', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ message: 'Moved to cart', cartItem: SAMPLE_CART_ITEM });

    const result = await cartService.moveToCart('saved-001');

    expect(apiClient.post).toHaveBeenCalledWith('/api/saved-items/saved-001/move-to-cart');
    expect(result.cartItem).toBeDefined();
    expect(result.message).toBe('Moved to cart');
  });
});
