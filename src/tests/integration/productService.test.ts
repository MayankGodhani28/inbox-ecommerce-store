/**
 * ─────────────────────────────────────────────────────
 *  LAYER 2: INTEGRATION TESTS — Service Layer with Mocked Network
 *  File: src/tests/integration/productService.test.ts
 *
 *  What companies test here:
 *   ✅ Services that fetch from APIs
 *   ✅ How multiple modules talk to each other
 *   ✅ Network calls are MOCKED — no real server needed
 *   ✅ Error handling paths (404, 500, network failure)
 *   ✅ Response data mapping correctness
 * ─────────────────────────────────────────────────────
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// IMPORTANT: vi.mock is hoisted ABOVE all imports by Vitest.
// Variables defined outside the factory aren't available yet.
// Solution: use vi.fn() directly inside the factory object.
vi.mock('../../services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// These imports are resolved AFTER the mock is established
import { productService } from '../../services/productService';
import { apiClient } from '../../services/apiClient';

// ── Sample fixtures (what the server normally returns) ──
const SAMPLE_PRODUCT = {
  id: 'prod-001',
  name: 'Sony WH-1000XM5',
  brand: 'Sony',
  category: 'Electronics' as const,
  description: 'Industry-leading noise cancelling headphones',
  price: 24999,
  originalPrice: 34999,
  discount: 28,
  rating: 4.8,
  reviewCount: 1250,
  stock: 45,
  images: ['https://images.unsplash.com/photo-xxx'],
  specifications: {},
};

const SAMPLE_REVIEW = {
  id: 'rev-001',
  userName: 'Rahul Sharma',
  rating: 5,
  date: '2026-10-20',
  title: 'Excellent noise cancelling!',
  comment: 'Best headphones I have ever used.',
  verifiedPurchase: true,
  helpfulCount: 42,
};

// ═══════════════════════════════════════════════════════
//  TEST SUITE 1: getProducts (with various filters)
// ═══════════════════════════════════════════════════════
describe('productService.getProducts — Integration Tests', () => {
  afterEach(() => vi.clearAllMocks());

  it('should return list of products for default (no filter) query', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ products: [SAMPLE_PRODUCT], total: 1 });

    const result = await productService.getProducts();

    expect(apiClient.get).toHaveBeenCalledWith('/api/products');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('prod-001');
    expect(result[0].name).toBe('Sony WH-1000XM5');
  });

  it('should pass category filter correctly in the URL', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ products: [], total: 0 });

    await productService.getProducts({ category: 'Electronics' });

    expect(apiClient.get).toHaveBeenCalledWith('/api/products?category=Electronics');
  });

  it('should pass multiple filters together in query string', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ products: [], total: 0 });

    await productService.getProducts({ category: 'Fashion', minPrice: 500, maxPrice: 5000, sort: 'price-asc' });

    const calledUrl = vi.mocked(apiClient.get).mock.calls[0][0] as string;
    expect(calledUrl).toContain('category=Fashion');
    expect(calledUrl).toContain('minPrice=500');
    expect(calledUrl).toContain('maxPrice=5000');
    expect(calledUrl).toContain('sort=price-asc');
  });

  it('should propagate server errors (500) to the caller', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Internal Server Error'));

    await expect(productService.getProducts()).rejects.toThrow('Internal Server Error');
  });
});

// ═══════════════════════════════════════════════════════
//  TEST SUITE 2: getProductById
// ═══════════════════════════════════════════════════════
describe('productService.getProductById — Integration Tests', () => {
  afterEach(() => vi.clearAllMocks());

  it('should return a product when found', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ product: SAMPLE_PRODUCT });

    const product = await productService.getProductById('prod-001');

    expect(apiClient.get).toHaveBeenCalledWith('/api/products/prod-001');
    expect(product).not.toBeNull();
    expect(product?.id).toBe('prod-001');
    expect(product?.price).toBe(24999);
  });

  it('should return null when product is not found (404)', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce({ status: 404, message: 'Not found' });

    const product = await productService.getProductById('non-existent-id');

    expect(product).toBeNull();
  });

  it('should re-throw non-404 errors (e.g., 500 server error)', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce({ status: 500, message: 'Database down' });

    await expect(productService.getProductById('prod-001')).rejects.toMatchObject({
      status: 500,
      message: 'Database down',
    });
  });
});

// ═══════════════════════════════════════════════════════
//  TEST SUITE 3: Reviews
// ═══════════════════════════════════════════════════════
describe('productService.addReview — Integration Tests', () => {
  afterEach(() => vi.clearAllMocks());

  it('should POST a review and return the created review', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ review: SAMPLE_REVIEW });

    const newReview = await productService.addReview('prod-001', {
      rating: 5,
      title: 'Excellent!',
      comment: 'Best headphones.',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/products/prod-001/reviews', {
      rating: 5,
      title: 'Excellent!',
      comment: 'Best headphones.',
    });
    expect(newReview.id).toBe('rev-001');
    expect(newReview.verifiedPurchase).toBe(true);
  });

  it('should mark a review as helpful and return updated helpful count', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ reviewId: 'rev-001', helpfulCount: 43 });

    const count = await productService.markReviewHelpful('prod-001', 'rev-001');

    expect(apiClient.post).toHaveBeenCalledWith('/api/products/prod-001/reviews/rev-001/helpful');
    expect(count).toBe(43);
  });
});
