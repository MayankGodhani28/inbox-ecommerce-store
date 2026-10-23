import { apiClient } from './apiClient';
import { Coupon, CartItem } from '../types';

export interface AuthoritativeQuote {
  items: Array<{
    productId: string;
    name: string;
    brand: string;
    category: string;
    image: string;
    price: number;
    priceMinor: number;
    quantity: number;
    lineTotal: number;
    lineTotalMinor: number;
    selectedColor?: string;
    selectedSize?: string;
    stock: number;
  }>;
  totalItemsCount: number;
  subtotal: number;
  subtotalMinor: number;
  discount: number;
  discountMinor: number;
  deliveryFee: number;
  deliveryFeeMinor: number;
  tax: number;
  taxMinor: number;
  total: number;
  totalMinor: number;
  deliveryMethod: 'Standard' | 'Express';
  appliedCoupon: Coupon | null;
  couponError?: string;
  warnings: string[];
}

export const pricingService = {
  async getQuote(params: {
    items?: Array<{ productId: string; quantity: number; selectedColor?: string; selectedSize?: string }>;
    deliveryMethod?: 'Standard' | 'Express';
    couponCode?: string;
  }): Promise<AuthoritativeQuote> {
    return apiClient.post('/api/checkout/quote', params);
  },

  async validateCoupon(params: {
    code: string;
    items?: Array<{ productId: string; quantity: number; selectedColor?: string; selectedSize?: string }>;
    deliveryMethod?: 'Standard' | 'Express';
  }): Promise<{ coupon: Coupon; discount: number; quote: AuthoritativeQuote }> {
    return apiClient.post('/api/coupons/validate', params);
  },

  async getCoupons(): Promise<{ coupons: Coupon[] }> {
    return apiClient.get('/api/coupons');
  },
};
