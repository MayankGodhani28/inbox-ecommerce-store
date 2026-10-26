import test from 'node:test';
import assert from 'node:assert/strict';
import { isPositiveQuantity, sanitizeCart } from '../src/utils/cartValidation.ts';
import { isSafeApiRequest } from '../server/security/requestPolicy.ts';

const item = (quantity = 1, stock = 3, price = 10) => ({
  id: 'cart-a', product: { id: 'product-a', stock, price }, quantity,
});

test('quantities reject negative, zero, fractions, strings and non-finite numbers', () => {
  for (const value of [-1, 0, 1.5, NaN, Infinity, '2', null, undefined, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(isPositiveQuantity(value), false);
  }
  assert.equal(isPositiveQuantity(1), true);
});

test('persisted carts reject invalid containers and malicious entries', () => {
  for (const value of [null, {}, 'bad']) assert.deepEqual(sanitizeCart(value), []);
  assert.deepEqual(sanitizeCart([null, {}, item(-1), item(1.5), item(NaN), item(1, 0), item(1, 2, -1)]), []);
});

test('persisted carts clamp stock while preserving valid variants', () => {
  const original = { ...item(8), selectedColor: 'Red' };
  const result = sanitizeCart([original]);
  assert.equal(result[0].quantity, 3);
  assert.equal(result[0].selectedColor, 'Red');
  assert.equal(original.quantity, 8);
});

const origins = ['https://shop.example'];
const safeHeaders = { origin: origins[0], requestedWith: 'XMLHttpRequest' };

test('all state changing methods require the CSRF header including login and logout', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    for (const route of ['/api/auth/login', '/api/auth/logout', '/api/cart/items']) {
      assert.equal(isSafeApiRequest(method, route, { origin: origins[0] }, origins), false);
      assert.equal(isSafeApiRequest(method, route, safeHeaders, origins), true);
      assert.equal(isSafeApiRequest(method, route, { ...safeHeaders, origin: 'https://evil.example' }, origins), false);
    }
  }
});

test('cross-site requests without origin fail and non-browser clients require the header', () => {
  assert.equal(isSafeApiRequest('POST', '/api/orders', {}, origins), false);
  assert.equal(isSafeApiRequest('POST', '/api/orders', { requestedWith: 'XMLHttpRequest' }, origins), true);
  assert.equal(isSafeApiRequest('POST', '/api/orders', {
    requestedWith: 'XMLHttpRequest', fetchSite: 'cross-site',
  }, origins), false);
});

test('only the exact signed Stripe webhook POST is exempt', () => {
  assert.equal(isSafeApiRequest('POST', '/api/payments/webhook', {}, origins), true);
  for (const route of ['/api/payments/webhook/extra', '/api/payments/webhook-evil']) {
    assert.equal(isSafeApiRequest('POST', route, {}, origins), false);
  }
  assert.equal(isSafeApiRequest('DELETE', '/api/payments/webhook', {}, origins), false);
});

test('safe read requests remain available to anonymous browsers', () => {
  for (const method of ['GET', 'HEAD', 'OPTIONS']) {
    assert.equal(isSafeApiRequest(method, '/api/products', {}, origins), true);
  }
});
