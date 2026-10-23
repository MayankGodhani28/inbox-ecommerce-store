import { apiClient } from './apiClient';
import { Product } from '../types';

export const wishlistService = {
  async getWishlist(): Promise<{ products: Product[]; count: number }> {
    return apiClient.get('/api/wishlist');
  },

  async toggleWishlist(productId: string): Promise<{ added: boolean; message: string }> {
    return apiClient.post('/api/wishlist/toggle', { productId });
  },

  async addToWishlist(productId: string): Promise<void> {
    await apiClient.post('/api/wishlist/items', { productId });
  },

  async removeFromWishlist(productId: string): Promise<void> {
    await apiClient.delete(`/api/wishlist/items/${productId}`);
  },

  async clearWishlist(): Promise<void> {
    await apiClient.delete('/api/wishlist');
  },

  async mergeWishlist(productIds: string[]): Promise<{ products: Product[] }> {
    return apiClient.post('/api/wishlist/merge', { productIds });
  },
};
