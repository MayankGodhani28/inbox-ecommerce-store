import type { Product } from '@prisma/client';

/** Convert database minor-unit prices and JSON fields to the public catalog representation. */
export function formatProduct(p: Product) {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    description: p.description,
    price: p.price / 100,
    originalPrice: p.originalPrice / 100,
    discount: p.discount,
    rating: p.rating,
    reviewCount: p.reviewCount,
    stock: p.stock,
    images: Array.isArray(p.images) ? p.images : [],
    colors: Array.isArray(p.colors) ? p.colors : [],
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    specifications: typeof p.specifications === 'object' && p.specifications !== null ? p.specifications : {},
    isTrending: p.isTrending,
    isBestSeller: p.isBestSeller,
    isNewArrival: p.isNewArrival,
    isDealOfDay: p.isDealOfDay,
  };
}

/** Include management metadata for catalog and administrator responses. */
export function formatCatalogProduct(product: Product) {
  return {
    ...formatProduct(product),
    isArchived: product.isArchived,
    createdAt: product.createdAt.toISOString(),
  };
}
