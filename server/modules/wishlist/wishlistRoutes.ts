import { Router, Response } from 'express';
import { prisma } from '../../db/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth.js';

export const wishlistRouter = Router();

wishlistRouter.use(requireAuth);

function formatProduct(p: any) {
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

// GET /api/wishlist - Get current user's wishlist items
wishlistRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const items = await prisma.wishlistItem.findMany({
    where: {
      userId: req.user!.id,
      product: { isArchived: false },
    },
    include: { product: true },
    orderBy: { createdAt: 'desc' },
  });

  const products = items.map((item) => formatProduct(item.product));
  res.status(200).json({ data: { products, count: products.length } });
});

// POST /api/wishlist/toggle - Toggle product in wishlist
wishlistRouter.post('/toggle', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { productId } = req.body;

  if (!productId || typeof productId !== 'string') {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'productId is required' } });
    return;
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.isArchived) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found or unavailable' } });
    return;
  }

  const existing = await prisma.wishlistItem.findUnique({
    where: {
      userId_productId: {
        userId: req.user!.id,
        productId,
      },
    },
  });

  if (existing) {
    await prisma.wishlistItem.delete({
      where: { id: existing.id },
    });
    res.status(200).json({ data: { added: false, message: 'Removed from wishlist' } });
  } else {
    await prisma.wishlistItem.create({
      data: {
        userId: req.user!.id,
        productId,
      },
    });
    res.status(201).json({ data: { added: true, message: 'Added to wishlist' } });
  }
});

// POST /api/wishlist/items - Add to wishlist
wishlistRouter.post('/items', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { productId } = req.body;

  if (!productId || typeof productId !== 'string') {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'productId is required' } });
    return;
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.isArchived) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found or unavailable' } });
    return;
  }

  await prisma.wishlistItem.upsert({
    where: {
      userId_productId: {
        userId: req.user!.id,
        productId,
      },
    },
    update: {},
    create: {
      userId: req.user!.id,
      productId,
    },
  });

  res.status(201).json({ data: { message: 'Added to wishlist' } });
});

// DELETE /api/wishlist/items/:productId - Remove from wishlist
wishlistRouter.delete('/items/:productId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { productId } = req.params;

  await prisma.wishlistItem.deleteMany({
    where: {
      userId: req.user!.id,
      productId,
    },
  });

  res.status(200).json({ data: { message: 'Removed from wishlist' } });
});

// DELETE /api/wishlist/:productId - Alias for remove
wishlistRouter.delete('/:productId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { productId } = req.params;

  await prisma.wishlistItem.deleteMany({
    where: {
      userId: req.user!.id,
      productId,
    },
  });

  res.status(200).json({ data: { message: 'Removed from wishlist' } });
});

// DELETE /api/wishlist - Clear wishlist
wishlistRouter.delete('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await prisma.wishlistItem.deleteMany({
    where: { userId: req.user!.id },
  });

  res.status(200).json({ data: { message: 'Wishlist cleared' } });
});

// POST /api/wishlist/merge - Merge guest wishlist into user's account
wishlistRouter.post('/merge', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { productIds } = req.body;

  if (!Array.isArray(productIds)) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'productIds array is required' } });
    return;
  }

  for (const pid of productIds) {
    if (!pid || typeof pid !== 'string') continue;
    const product = await prisma.product.findUnique({ where: { id: pid } });
    if (!product || product.isArchived) continue;

    await prisma.wishlistItem.upsert({
      where: {
        userId_productId: {
          userId: req.user!.id,
          productId: pid,
        },
      },
      update: {},
      create: {
        userId: req.user!.id,
        productId: pid,
      },
    });
  }

  const items = await prisma.wishlistItem.findMany({
    where: {
      userId: req.user!.id,
      product: { isArchived: false },
    },
    include: { product: true },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ data: { products: items.map((i) => formatProduct(i.product)) } });
});
