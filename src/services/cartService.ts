import { apiClient } from './apiClient';
import { CartItem, SavedItem } from '../types';

export const cartService = {
  async getCart(): Promise<{ items: CartItem[]; totalCount: number }> {
    return apiClient.get('/api/cart');
  },

  async addItem(productId: string, quantity = 1, selectedColor = '', selectedSize = ''): Promise<{ item: CartItem }> {
    return apiClient.post('/api/cart/items', { productId, quantity, selectedColor, selectedSize });
  },

  async updateItemQuantity(itemId: string, quantity: number): Promise<{ item: CartItem } | { message: string }> {
    return apiClient.patch(`/api/cart/items/${itemId}`, { quantity });
  },

  async removeItem(itemId: string): Promise<void> {
    await apiClient.delete(`/api/cart/items/${itemId}`);
  },

  async clearCart(): Promise<void> {
    await apiClient.delete('/api/cart');
  },

  async mergeCart(
    items: Array<{ productId: string; quantity: number; selectedColor?: string; selectedSize?: string }>
  ): Promise<{ items: CartItem[] }> {
    return apiClient.post('/api/cart/merge', { items });
  },

  async getSavedItems(): Promise<{ items: SavedItem[] }> {
    return apiClient.get('/api/saved-items');
  },

  async saveItem(
    productId: string,
    selectedColor = '',
    selectedSize = '',
    moveFromCart = false
  ): Promise<{ item: SavedItem }> {
    return apiClient.post('/api/saved-items', { productId, selectedColor, selectedSize, moveFromCart });
  },

  async moveToCart(savedItemId: string): Promise<{ message: string; cartItem: CartItem }> {
    return apiClient.post(`/api/saved-items/${savedItemId}/move-to-cart`);
  },

  async removeSavedItem(savedItemId: string): Promise<void> {
    await apiClient.delete(`/api/saved-items/${savedItemId}`);
  },

  async mergeSavedItems(
    items: Array<{ productId: string; selectedColor?: string; selectedSize?: string }>
  ): Promise<{ items: SavedItem[] }> {
    return apiClient.post('/api/saved-items/merge', { items });
  },
};
