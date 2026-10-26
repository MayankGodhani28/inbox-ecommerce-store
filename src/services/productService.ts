import { Product, ProductReview } from '../types';
import { apiClient } from './apiClient';

// Clean up obsolete localStorage catalog caches
try {
  localStorage.removeItem('inbox_products_data_v1');
  localStorage.removeItem('inbox_reviews_data_v1');
} catch {
  // Ignored if storage unavailable
}

export interface CatalogQueryOptions {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
  trending?: boolean;
  bestSeller?: boolean;
  newArrival?: boolean;
  dealOfDay?: boolean;
}

export const productService = {
  // Get products with optional filtering/pagination
  async getProducts(options: CatalogQueryOptions = {}): Promise<Product[]> {
    const params = new URLSearchParams();
    if (options.category) params.set('category', options.category);
    if (options.search) params.set('search', options.search);
    if (options.minPrice !== undefined) params.set('minPrice', String(options.minPrice));
    if (options.maxPrice !== undefined) params.set('maxPrice', String(options.maxPrice));
    if (options.sort) params.set('sort', options.sort);
    if (options.page) params.set('page', String(options.page));
    if (options.pageSize) params.set('pageSize', String(options.pageSize));
    if (options.trending) params.set('trending', 'true');
    if (options.bestSeller) params.set('bestSeller', 'true');
    if (options.newArrival) params.set('newArrival', 'true');
    if (options.dealOfDay) params.set('dealOfDay', 'true');

    const query = params.toString() ? `?${params.toString()}` : '';
    const data = await apiClient.get<{ products: Product[]; total: number }>(`/api/products${query}`);
    return data.products;
  },

  // Get single product by id
  async getProductById(id: string): Promise<Product | null> {
    try {
      const data = await apiClient.get<{ product: Product }>(`/api/products/${id}`);
      return data.product;
    } catch (err: any) {
      if (err?.status === 404) return null;
      throw err;
    }
  },

  // Get merchant admin products (isolated to current merchant)
  async getAdminProducts(): Promise<Product[]> {
    const data = await apiClient.get<{ products: Product[] }>('/api/admin/products');
    return data.products;
  },

  // Add new product (Admin only)
  async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const data = await apiClient.post<{ product: Product }>('/api/admin/products', product);
    return data.product;
  },

  // Update product (Admin only)
  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const data = await apiClient.patch<{ product: Product }>(`/api/admin/products/${id}`, updates);
    return data.product;
  },

  // Delete/Archive product (Admin only)
  async deleteProduct(id: string): Promise<boolean> {
    await apiClient.delete(`/api/admin/products/${id}`);
    return true;
  },

  // Get reviews for product
  async getReviewsForProduct(productId: string): Promise<ProductReview[]> {
    const data = await apiClient.get<{ reviews: ProductReview[] }>(`/api/products/${productId}/reviews`);
    return data.reviews;
  },

  // Add review (Authenticated customer with verified purchase calculation)
  async addReview(
    productId: string,
    review: { rating: number; title: string; comment: string }
  ): Promise<ProductReview> {
    const data = await apiClient.post<{ review: ProductReview }>(`/api/products/${productId}/reviews`, review);
    return data.review;
  },

  // Mark review as helpful
  async markReviewHelpful(productId: string, reviewId: string): Promise<number> {
    const data = await apiClient.post<{ reviewId: string; helpfulCount: number }>(
      `/api/products/${productId}/reviews/${reviewId}/helpful`
    );
    return data.helpfulCount;
  },

  // Upload product image to Cloudinary (Admin/Seller only)
  async uploadImage(file: File): Promise<{
    url: string;
    publicId: string;
    format: string;
    width: number;
    height: number;
  }> {
    const formData = new FormData();
    formData.append('image', file);
    return apiClient.upload<{
      url: string;
      publicId: string;
      format: string;
      width: number;
      height: number;
    }>('/api/admin/upload', formData);
  },
};
