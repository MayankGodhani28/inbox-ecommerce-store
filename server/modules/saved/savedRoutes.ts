import { Router, Response } from 'express';
import { prisma } from '../../db/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth.js';

export const savedRouter = Router();

savedRouter.use(requireAuth);

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

function formatSavedItem(item: any) {
  return {
    id: item.id,
    productId: item.productId,
    product: formatProduct(item.product),
    selectedColor: item.selectedColor || undefined,
    selectedSize: item.selectedSize || undefined,
    savedAt: item.createdAt.toISOString(),
  };
}

// GET /api/saved-items - List saved items for user
savedRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const items = await prisma.savedItem.findMany({
    where: {
      userId: req.user!.id,
      product: { isArchived: false },
    },
    include: { product: true },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ data: { items: items.map(formatSavedItem) } });
});

// POST /api/saved-items - Save item for later (optionally moving atomically from cart)
savedRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { productId, selectedColor = '', selectedSize = '', moveFromCart = false } = req.body;

  if (!productId || typeof productId !== 'string') {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'productId is required' } });
    return;
  }

  const colorKey = typeof selectedColor === 'string' ? selectedColor.trim() : '';
  const sizeKey = typeof selectedSize === 'string' ? selectedSize.trim() : '';

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.isArchived) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found or unavailable' } });
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    if (moveFromCart) {
      await tx.cartItem.deleteMany({
        where: {
          userId: req.user!.id,
          productId,
          selectedColor: colorKey,
          selectedSize: sizeKey,
        },
      });
    }

    const saved = await tx.savedItem.upsert({
      where: {
        userId_productId_selectedColor_selectedSize: {
          userId: req.user!.id,
          productId,
          selectedColor: colorKey,
          selectedSize: sizeKey,
        },
      },
      update: {},
      create: {
        userId: req.user!.id,
        productId,
        selectedColor: colorKey,
        selectedSize: sizeKey,
      },
      include: { product: true },
    });

    return saved;
  });

  res.status(201).json({ data: { item: formatSavedItem(result) } });
});

// POST /api/saved-items/:id/move-to-cart - Move saved item to cart atomically
savedRouter.post('/:id/move-to-cart', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const itemId = req.params.id;

  const savedItem = await prisma.savedItem.findUnique({
    where: { id: itemId },
    include: { product: true },
  });

  if (!savedItem || savedItem.userId !== req.user!.id) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Saved item not found' } });
    return;
  }

  if (savedItem.product.isArchived) {
    res.status(400).json({ error: { code: 'UNAVAILABLE', message: 'Product is no longer available' } });
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    // Delete from saved items
    await tx.savedItem.delete({ where: { id: itemId } });

    // Check existing cart item
    const existing = await tx.cartItem.findUnique({
      where: {
        userId_productId_selectedColor_selectedSize: {
          userId: req.user!.id,
          productId: savedItem.productId,
          selectedColor: savedItem.selectedColor,
          selectedSize: savedItem.selectedSize,
        },
      },
    });

    const newQty = existing
      ? Math.min(existing.quantity + 1, savedItem.product.stock)
      : Math.min(1, savedItem.product.stock);

    const cartItem = await tx.cartItem.upsert({
      where: {
        userId_productId_selectedColor_selectedSize: {
          userId: req.user!.id,
          productId: savedItem.productId,
          selectedColor: savedItem.selectedColor,
          selectedSize: savedItem.selectedSize,
        },
      },
      update: { quantity: newQty },
      create: {
        userId: req.user!.id,
        productId: savedItem.productId,
        selectedColor: savedItem.selectedColor,
        selectedSize: savedItem.selectedSize,
        quantity: newQty,
      },
      include: { product: true },
    });

    return cartItem;
  });

  res.status(200).json({
    data: {
      message: 'Moved to cart',
      cartItem: {
        id: result.id,
        productId: result.productId,
        quantity: result.quantity,
        selectedColor: result.selectedColor || undefined,
        selectedSize: result.selectedSize || undefined,
        product: formatProduct(result.product),
      },
    },
  });
});

// DELETE /api/saved-items/:id - Remove saved item
savedRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const itemId = req.params.id;

  const item = await prisma.savedItem.findUnique({ where: { id: itemId } });
  if (!item || item.userId !== req.user!.id) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Saved item not found' } });
    return;
  }

  await prisma.savedItem.delete({ where: { id: itemId } });
  res.status(200).json({ data: { message: 'Item removed from saved items' } });
});

// POST /api/saved-items/merge - Merge guest saved items
savedRouter.post('/merge', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { items } = req.body;
  if (!Array.isArray(items)) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Items array is required' } });
    return;
  }

  for (const item of items) {
    if (!item.productId) continue;
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product || product.isArchived) continue;

    const colorKey = typeof item.selectedColor === 'string' ? item.selectedColor.trim() : '';
    const sizeKey = typeof item.selectedSize === 'string' ? item.selectedSize.trim() : '';

    await prisma.savedItem.upsert({
      where: {
        userId_productId_selectedColor_selectedSize: {
          userId: req.user!.id,
          productId: item.productId,
          selectedColor: colorKey,
          selectedSize: sizeKey,
        },
      },
      update: {},
      create: {
        userId: req.user!.id,
        productId: item.productId,
        selectedColor: colorKey,
        selectedSize: sizeKey,
      },
    });
  }

  const updated = await prisma.savedItem.findMany({
    where: { userId: req.user!.id, product: { isArchived: false } },
    include: { product: true },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ data: { items: updated.map(formatSavedItem) } });
});
