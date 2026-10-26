/**
 * ─────────────────────────────────────────────────────
 *  LAYER 5: REGRESSION TESTS — Preventing Old Bugs
 *  File: src/tests/regression/knownBugFixes.test.ts
 *
 *  What companies test here:
 *   ✅ Every bug that was found in production gets a test
 *   ✅ Ensures the bug can NEVER come back
 *   ✅ Documents historical bugs and their fixes
 *   ✅ Runs in CI on every code change
 * ─────────────────────────────────────────────────────
 */

import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════
//  REGRESSION BUG #001
//  Issue: Super Admin dashboard showed ALL orders/products
//  from ALL sellers when Admin logged in for the first time
//  with no items added yet.
//
//  Root Cause: Admin product query didn't filter by sellerId.
//  Fix: Query now requires `WHERE products.ownerId = currentUser.id`
//
//  Test: Verify filtering logic correctly isolates merchant products
// ═══════════════════════════════════════════════════════

// Simulated database-style filtering function
function filterProductsByOwner(
  allProducts: Array<{ id: string; name: string; ownerId: string }>,
  currentUserId: string
): Array<{ id: string; name: string; ownerId: string }> {
  return allProducts.filter((p) => p.ownerId === currentUserId);
}

describe('REGRESSION #001: Admin sees only own products', () => {
  const allProducts = [
    { id: 'p1', name: 'Sony Headphones', ownerId: 'seller-arti' },
    { id: 'p2', name: 'Samsung TV', ownerId: 'seller-mayank' },
    { id: 'p3', name: 'iPhone 16', ownerId: 'seller-arti' },
    { id: 'p4', name: 'Nike Shoes', ownerId: 'seller-other' },
  ];

  it('should return ONLY products owned by the logged-in seller', () => {
    const result = filterProductsByOwner(allProducts, 'seller-arti');
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.ownerId === 'seller-arti')).toBe(true);
  });

  it('should return empty array for new seller with NO products', () => {
    const result = filterProductsByOwner(allProducts, 'brand-new-seller');
    expect(result).toHaveLength(0); // Bug was: returned ALL products
  });

  it('should not leak products from other sellers', () => {
    const result = filterProductsByOwner(allProducts, 'seller-arti');
    const foreignProducts = result.filter((p) => p.ownerId !== 'seller-arti');
    expect(foreignProducts).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════
//  REGRESSION BUG #002
//  Issue: Admin form submission redirected to /admin instead
//  of customer storefront (home) after seller application submit.
//
//  Root Cause: navigate('admin') was called instead of navigate('home').
//  Fix: onNavigate('home') called after successful application submit.
//
//  Test: Verify the redirect destination after form submission
// ═══════════════════════════════════════════════════════

type NavigationTarget = 'home' | 'admin' | 'super-admin' | 'orders';

function getPostSubmitRedirect(isNewApplication: boolean): NavigationTarget {
  // After a new application submission, redirect to home (customer storefront)
  // BUG WAS: Always redirected to 'admin'
  if (isNewApplication) return 'home';
  return 'admin';
}

describe('REGRESSION #002: Form submission redirects to home, not admin', () => {
  it('should redirect to "home" after new seller application is submitted', () => {
    const destination = getPostSubmitRedirect(true);
    expect(destination).toBe('home');
    expect(destination).not.toBe('admin'); // This was the bug
  });

  it('should redirect to admin if the seller is already an approved admin', () => {
    const destination = getPostSubmitRedirect(false);
    expect(destination).toBe('admin');
  });
});

// ═══════════════════════════════════════════════════════
//  REGRESSION BUG #003
//  Issue: super-admin/admins/:id/status API silently did nothing
//  when updating seller status because it read `req.body.status`
//  but the frontend sent `req.body.sellerStatus`.
//
//  Root Cause: Body destructuring mismatch.
//  Fix: Backend now reads BOTH `status` and `sellerStatus`.
//
//  Test: Verify the resolved value is picked correctly
// ═══════════════════════════════════════════════════════

function resolveSellerStatus(
  body: { status?: string; sellerStatus?: string }
): string | undefined {
  // Fix: coalesce sellerStatus (frontend sends) with status (fallback)
  return body.sellerStatus || body.status;
}

describe('REGRESSION #003: Admin status update reads correct field from request body', () => {
  it('should read sellerStatus when only sellerStatus is provided', () => {
    const result = resolveSellerStatus({ sellerStatus: 'SUSPENDED' });
    expect(result).toBe('SUSPENDED');
  });

  it('should fallback to status when only status is provided (legacy)', () => {
    const result = resolveSellerStatus({ status: 'APPROVED' });
    expect(result).toBe('APPROVED');
  });

  it('should prefer sellerStatus over status when both are present', () => {
    const result = resolveSellerStatus({ status: 'APPROVED', sellerStatus: 'SUSPENDED' });
    expect(result).toBe('SUSPENDED');
  });

  it('should return undefined when neither field is present (body was empty)', () => {
    const result = resolveSellerStatus({});
    expect(result).toBeUndefined(); // Bug was: silently no-op
  });
});

// ═══════════════════════════════════════════════════════
//  REGRESSION BUG #004
//  Issue: When an admin is suspended, their catalog items
//  remained visible on the public customer storefront.
//
//  Root Cause: Product archival was not done on suspension.
//  Fix: Suspend transaction sets isArchived:true on all seller products.
//
//  Test: Products must be invisible after seller suspension
// ═══════════════════════════════════════════════════════

function getVisibleProducts<T extends { isArchived: boolean }>(
  products: T[],
): T[] {
  // Customer storefront only shows non-archived products
  return products.filter((p) => !p.isArchived);
}

function suspendSellerProducts(
  products: Array<{ id: string; ownerId: string; isArchived: boolean }>,
  sellerId: string
): Array<{ id: string; ownerId: string; isArchived: boolean }> {
  return products.map((p) =>
    p.ownerId === sellerId ? { ...p, isArchived: true } : p
  );
}

describe('REGRESSION #004: Suspended seller products are hidden from storefront', () => {
  const products = [
    { id: 'p1', ownerId: 'seller-arti', isArchived: false },
    { id: 'p2', ownerId: 'seller-arti', isArchived: false },
    { id: 'p3', ownerId: 'seller-other', isArchived: false },
  ];

  it('should archive all products of the suspended seller', () => {
    const updated = suspendSellerProducts(products, 'seller-arti');
    const artiProducts = updated.filter((p) => p.ownerId === 'seller-arti');
    expect(artiProducts.every((p) => p.isArchived)).toBe(true);
  });

  it('should NOT archive products from OTHER sellers', () => {
    const updated = suspendSellerProducts(products, 'seller-arti');
    const otherProducts = updated.filter((p) => p.ownerId === 'seller-other');
    expect(otherProducts.every((p) => !p.isArchived)).toBe(true);
  });

  it('should make suspended seller products invisible on storefront', () => {
    const updated = suspendSellerProducts(products, 'seller-arti');
    const visible = getVisibleProducts(updated);
    // Only seller-other's product should be visible
    expect(visible).toHaveLength(1);
    expect(visible[0].ownerId).toBe('seller-other');
  });
});
