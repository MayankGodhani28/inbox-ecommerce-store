import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CartProvider, useCart } from '../../context/CartContext';
import type { Product } from '../../types';

const mocks = vi.hoisted(() => ({ toast: vi.fn(), quote: vi.fn() }));
vi.mock('../../context/ToastContext', () => ({ useToast: () => ({ showToast: mocks.toast }) }));
vi.mock('../../context/LanguageContext', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: null, isAuthenticated: false }) }));
vi.mock('../../services/pricingService', () => ({ pricingService: { getQuote: mocks.quote } }));
const product = { id: 'p1', name: 'Product', price: 10, stock: 5 } as Product;
const wrapper = ({ children }: { children: React.ReactNode }) => <CartProvider>{children}</CartProvider>;
const invalid = [-1, -Infinity, NaN, Infinity, 0.5, 1.5, '2', 'bad', null, Number.MAX_SAFE_INTEGER + 1];

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  // Leave the quote pending to exercise the actual offline pricing path.
  mocks.quote.mockImplementation(() => new Promise(() => {}));
});
afterEach(cleanup);

it.each([...invalid, 0])('rejects malformed add quantity %s without changing cart', async (quantity) => {
  const { result } = renderHook(useCart, { wrapper });
  await act(async () => { await result.current.addToCart(product, quantity as number); });
  expect(result.current.cart).toEqual([]);
  expect(result.current.total).toBe(0);
  expect(mocks.quote).not.toHaveBeenCalled();
  expect(mocks.toast).toHaveBeenCalledWith('Invalid quantity', expect.any(Object));
});

it.each([...invalid, undefined])('rejects malformed update quantity %s without removing an item', async (quantity) => {
  const { result } = renderHook(useCart, { wrapper });
  await act(async () => { await result.current.addToCart(product, 2); });
  await act(async () => { await result.current.updateQuantity(product.id, quantity as number); });
  expect(result.current.cart[0].quantity).toBe(2);
  expect(result.current.subtotal).toBe(20);
});

it('keeps default quantity, stock clamping and explicit zero removal', async () => {
  const { result } = renderHook(useCart, { wrapper });
  await act(async () => { await result.current.addToCart(product); });
  expect(result.current.cart[0].quantity).toBe(1);
  await act(async () => { await result.current.updateQuantity(product.id, 10); });
  expect(result.current.cart[0].quantity).toBe(5);
  expect(result.current.subtotal).toBe(50);
  await act(async () => { await result.current.updateQuantity(product.id, 0); });
  expect(result.current.cart).toEqual([]);
  expect(result.current.total).toBe(0);
});

it.each(invalid)('does not use malformed in-memory quantity %s in fallback totals', async (quantity) => {
  const { result } = renderHook(useCart, { wrapper });
  await act(async () => { await result.current.addToCart(product, 2); });
  // Simulate state corrupted by a consumer after initialization sanitization.
  result.current.cart[0].quantity = quantity as number;
  act(() => result.current.setDeliveryMethod('Express'));
  expect(result.current.totalItemsCount).toBe(0);
  expect(result.current.subtotal).toBe(0);
  expect(result.current.total).toBe(0);
});
