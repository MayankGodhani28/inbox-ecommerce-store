import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    upload: vi.fn(),
  },
}));

import { productService } from '../../services/productService';
import { apiClient } from '../../services/apiClient';

describe('productService.uploadImage — Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should upload a product image file to /api/admin/upload and return secure URL', async () => {
    const mockFile = new File(['dummy-image-bytes'], 'test-headphones.png', { type: 'image/png' });
    const mockResponse = {
      url: 'https://res.cloudinary.com/fx8jzgrg/image/upload/v1234567890/inbox-products/prod_123.webp',
      publicId: 'inbox-products/prod_123',
      format: 'webp',
      width: 1200,
      height: 1200,
    };

    vi.mocked(apiClient.upload).mockResolvedValueOnce(mockResponse as any);

    const result = await productService.uploadImage(mockFile);

    expect(apiClient.upload).toHaveBeenCalledTimes(1);
    const [endpoint, formData] = vi.mocked(apiClient.upload).mock.calls[0];
    expect(endpoint).toBe('/api/admin/upload');
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('image')).toBeTruthy();
    expect(result.url).toBe(mockResponse.url);
    expect(result.publicId).toBe(mockResponse.publicId);
  });

  it('should propagate upload error when Cloudinary is not configured or rejects file', async () => {
    const mockFile = new File(['corrupt-data'], 'bad.txt', { type: 'text/plain' });
    vi.mocked(apiClient.upload).mockRejectedValueOnce(
      new Error('Unsupported file format (text/plain). Allowed image formats: JPG, PNG, WEBP, GIF, AVIF.')
    );

    await expect(productService.uploadImage(mockFile)).rejects.toThrow(
      'Unsupported file format'
    );
  });
});
