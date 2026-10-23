/**
 * ─────────────────────────────────────────────────────
 *  LAYER 6: SMOKE / END-TO-END SCENARIO TESTS
 *  File: src/tests/e2e/checkoutFlow.test.ts
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
import { productService } from '../../services/productService';
import { pricingService } from '../../services/pricingService';
import { apiClient } from '../../services/apiClient';

const g = () => vi.mocked(apiClient.get);
const p = () => vi.mocked(apiClient.post);

// ── Shared fixtures ──
const PRODUCT = {
  id: 'prod-001',
  name: 'Sony WH-1000XM5',
  brand: 'Sony',
  category: 'Electronics' as const,
  description: 'Headphones',
  price: 24999,
  originalPrice: 34999,
  discount: 28,
  rating: 4.8,
  reviewCount: 1250,
  stock: 10,
  images: ['https://example.com/img.jpg'],
  specifications: {},
};

const CART_ITEM = { id: 'ci-001', product: PRODUCT, quantity: 1 };

const QUOTE = {
  items: [{ productId: 'prod-001', name: 'Sony WH-1000XM5', price: 24999, quantity: 1, lineTotal: 24999, priceMinor: 2499900, lineTotalMinor: 2499900, brand: 'Sony', category: 'Electronics', image: '', stock: 10 }],
  totalItemsCount: 1,
  subtotal: 24999,
  subtotalMinor: 2499900,
  discount: 0,
  discountMinor: 0,
  deliveryFee: 0,
  deliveryFeeMinor: 0,
  tax: 4499.82,
  taxMinor: 449982,
  total: 29498.82,
  totalMinor: 2949882,
  deliveryMethod: 'Standard' as const,
  appliedCoupon: null,
  warnings: [],
};

// ═══════════════════════════════════════════════════════
//  SCENARIO: Complete Browse → Cart → Quote Journey
// ═══════════════════════════════════════════════════════
describe('E2E Scenario: Browse → Cart → Quote → Order', () => {
  afterEach(() => vi.clearAllMocks());

  it('Step 1 — Customer can browse and find a product', async () => {
    g().mockResolvedValueOnce({ products: [PRODUCT], total: 1 });

    const products = await productService.getProducts({ category: 'Electronics' });

    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Sony WH-1000XM5');
    expect(products[0].stock).toBeGreaterThan(0);
  });

  it('Step 2 — Customer adds item to cart', async () => {
    p().mockResolvedValueOnce({ item: CART_ITEM });

    const result = await cartService.addItem('prod-001', 1, 'Black', '');

    expect(result.item.product.id).toBe('prod-001');
    expect(result.item.quantity).toBe(1);
  });

  it('Step 3 — Customer views cart and gets accurate item count', async () => {
    g().mockResolvedValueOnce({ items: [CART_ITEM], totalCount: 1 });

    const cart = await cartService.getCart();

    expect(cart.totalCount).toBe(1);
    expect(cart.items[0].product.name).toBe('Sony WH-1000XM5');
  });

  it('Step 4 — System generates a server-authoritative price quote', async () => {
    p().mockResolvedValueOnce(QUOTE);

    const quote = await pricingService.getQuote({
      items: [{ productId: 'prod-001', quantity: 1 }],
      deliveryMethod: 'Standard',
    });

    expect(quote.subtotal).toBe(24999);
    expect(quote.tax).toBeGreaterThan(0);
    expect(quote.total).toBeGreaterThan(quote.subtotal);
    expect(quote.appliedCoupon).toBeNull();
  });

  it('Step 5 — Customer applies a valid coupon code', async () => {
    const coupon = { code: 'INBOX10', description: '10% off', discountPercentage: 10, minSpend: 500, maxDiscount: 2000 };
    const discountedQuote = { ...QUOTE, discount: 2499.9, total: 26998.92, appliedCoupon: coupon };
    p().mockResolvedValueOnce({ coupon, discount: 2499.9, quote: discountedQuote });

    const result = await pricingService.validateCoupon({
      code: 'INBOX10',
      items: [{ productId: 'prod-001', quantity: 1 }],
    });

    expect(result.coupon.code).toBe('INBOX10');
    expect(result.discount).toBeGreaterThan(0);
    expect(result.quote.appliedCoupon).not.toBeNull();
    expect(result.quote.total).toBeLessThan(QUOTE.total);
  });
});

// ═══════════════════════════════════════════════════════
//  SCENARIO: Guest Cart Preservation on Login
// ═══════════════════════════════════════════════════════
describe('E2E Scenario: Guest cart merges on login', () => {
  afterEach(() => vi.clearAllMocks());

  it('should merge guest cart items after authentication', async () => {
    const guestItems = [{ productId: 'prod-001', quantity: 2 }, { productId: 'prod-002', quantity: 1 }];
    const mergedCart = [
      { id: 'ci-001', product: PRODUCT, quantity: 2 },
      { id: 'ci-002', product: { ...PRODUCT, id: 'prod-002', name: 'Samsung TV' }, quantity: 1 },
    ];
    p().mockResolvedValueOnce({ items: mergedCart });

    const result = await cartService.mergeCart(guestItems);

    expect(apiClient.post).toHaveBeenCalledWith('/api/cart/merge', { items: guestItems });
    expect(result.items).toHaveLength(2);
    expect(result.items.some((i) => i.product.id === 'prod-001')).toBe(true);
    expect(result.items.some((i) => i.product.id === 'prod-002')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
//  SCENARIO: Out-of-stock item blocked at checkout
// ═══════════════════════════════════════════════════════
describe('E2E Scenario: Out-of-stock product cannot be added to cart', () => {
  afterEach(() => vi.clearAllMocks());

  it('should prevent adding out-of-stock product (server returns 400)', async () => {
    p().mockRejectedValueOnce(Object.assign(new Error('Product is out of stock'), { status: 400 }));

    await expect(cartService.addItem('prod-outofstock', 1)).rejects.toThrow('Product is out of stock');
  });

  it('should not crash the session after an out-of-stock rejection', async () => {
    p().mockRejectedValueOnce(new Error('Out of stock'));
    g().mockResolvedValueOnce({ items: [CART_ITEM], totalCount: 1 });

    try { await cartService.addItem('prod-outofstock', 1); } catch { /* expected */ }

    const cart = await cartService.getCart();
    expect(cart.items).toHaveLength(1);
  });
});
