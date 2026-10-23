/**
 * ─────────────────────────────────────────────────────
 *  LAYER 1: UNIT TESTS — Pure Business Logic
 *  File: src/tests/unit/cartCalculations.test.ts
 *
 *  What companies test here:
 *   ✅ Pure functions with no side-effects
 *   ✅ Edge cases (zero, negative, overflow)
 *   ✅ Boundary conditions
 *   ✅ Fast — runs in milliseconds
 *   ✅ No database or network needed
 * ─────────────────────────────────────────────────────
 */

import { describe, it, expect } from 'vitest';

// ── Pure utility functions from the business domain ──

/**
 * Compute final cart total.
 * Used on backend pricing engine before placing orders.
 */
function computeCartTotal(
  items: Array<{ price: number; quantity: number }>,
  taxRate = 0.18,
  deliveryFee = 49,
  discountAmount = 0
): {
  subtotal: number;
  discount: number;
  tax: number;
  delivery: number;
  total: number;
} {
  if (items.length === 0) {
    return { subtotal: 0, discount: 0, tax: 0, delivery: 0, total: 0 };
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount = Math.min(discountAmount, subtotal); // can't discount more than subtotal
  const taxable = subtotal - discount;
  const tax = Math.round(taxable * taxRate * 100) / 100;
  const total = taxable + tax + deliveryFee;

  return { subtotal, discount, tax, delivery: deliveryFee, total };
}

/**
 * Calculate percentage discount on a product.
 */
function calculateProductDiscount(originalPrice: number, currentPrice: number): number {
  if (originalPrice <= 0) throw new Error('Original price must be greater than zero');
  if (currentPrice < 0) throw new Error('Current price cannot be negative');
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

/**
 * Check whether a coupon is applicable to the given order total.
 */
function isCouponApplicable(
  couponMinSpend: number,
  orderSubtotal: number,
  couponExpiry: Date,
  currentDate: Date = new Date()
): { applicable: boolean; reason?: string } {
  if (currentDate > couponExpiry) {
    return { applicable: false, reason: 'Coupon has expired' };
  }
  if (orderSubtotal < couponMinSpend) {
    return {
      applicable: false,
      reason: `Minimum spend of ₹${couponMinSpend} required. Current cart total: ₹${orderSubtotal}`,
    };
  }
  return { applicable: true };
}

// ═══════════════════════════════════════════════════════
//  TEST SUITE 1: Cart Total Computation
// ═══════════════════════════════════════════════════════
describe('computeCartTotal — Unit Tests', () => {
  it('should return all zeros for an empty cart', () => {
    const result = computeCartTotal([]);
    expect(result.subtotal).toBe(0);
    expect(result.total).toBe(0);
    expect(result.tax).toBe(0);
  });

  it('should correctly calculate subtotal for single item', () => {
    const result = computeCartTotal([{ price: 500, quantity: 3 }]);
    expect(result.subtotal).toBe(1500);
  });

  it('should calculate total with tax and delivery for multiple items', () => {
    const items = [
      { price: 999, quantity: 2 }, // 1998
      { price: 499, quantity: 1 }, // 499
    ];
    const result = computeCartTotal(items, 0.18, 49, 0);
    expect(result.subtotal).toBe(2497);
    expect(result.tax).toBe(449.46);
    expect(result.delivery).toBe(49);
    expect(result.total).toBe(2497 + 449.46 + 49);
  });

  it('should correctly apply discount before calculating tax', () => {
    const result = computeCartTotal([{ price: 1000, quantity: 1 }], 0.18, 0, 200);
    expect(result.subtotal).toBe(1000);
    expect(result.discount).toBe(200);
    expect(result.tax).toBe(144); // 18% of 800
    expect(result.total).toBe(944); // 800 + 144
  });

  it('should cap discount at subtotal to prevent negative totals', () => {
    const result = computeCartTotal([{ price: 100, quantity: 1 }], 0.18, 0, 999);
    expect(result.discount).toBe(100); // capped at subtotal
    expect(result.total).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════════════
//  TEST SUITE 2: Product Discount Percentage
// ═══════════════════════════════════════════════════════
describe('calculateProductDiscount — Unit Tests', () => {
  it('should return 20 for ₹500 product now priced at ₹400', () => {
    expect(calculateProductDiscount(500, 400)).toBe(20);
  });

  it('should return 50 for half-price product', () => {
    expect(calculateProductDiscount(1000, 500)).toBe(50);
  });

  it('should return 0 if no discount applied', () => {
    expect(calculateProductDiscount(799, 799)).toBe(0);
  });

  it('should throw if originalPrice is zero', () => {
    expect(() => calculateProductDiscount(0, 100)).toThrow('Original price must be greater than zero');
  });

  it('should throw if currentPrice is negative', () => {
    expect(() => calculateProductDiscount(500, -50)).toThrow('Current price cannot be negative');
  });

  it('should correctly round percentage (e.g., 33.33% → 33)', () => {
    expect(calculateProductDiscount(300, 200)).toBe(33);
  });
});

// ═══════════════════════════════════════════════════════
//  TEST SUITE 3: Coupon Applicability Logic
// ═══════════════════════════════════════════════════════
describe('isCouponApplicable — Unit Tests', () => {
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

  it('should return applicable:true when spend meets minimum and coupon is valid', () => {
    const result = isCouponApplicable(500, 700, futureDate);
    expect(result.applicable).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should reject expired coupons', () => {
    const result = isCouponApplicable(500, 700, pastDate);
    expect(result.applicable).toBe(false);
    expect(result.reason).toContain('expired');
  });

  it('should reject when cart total is below minimum spend', () => {
    const result = isCouponApplicable(1000, 450, futureDate);
    expect(result.applicable).toBe(false);
    expect(result.reason).toContain('1000');
    expect(result.reason).toContain('450');
  });

  it('should allow coupon when cart exactly meets the minimum spend (boundary)', () => {
    const result = isCouponApplicable(500, 500, futureDate);
    expect(result.applicable).toBe(true);
  });
});
