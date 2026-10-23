import { Router, Response } from 'express';
import { prisma } from '../../db/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth.js';

export const cartRouter = Router();

cartRouter.use(requireAuth);

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

function formatCartItem(item: any) {
  return {
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    selectedColor: item.selectedColor || undefined,
    selectedSize: item.selectedSize || undefined,
    product: formatProduct(item.product),
  };
}

// GET /api/cart - Get user's active cart with verified live prices & stock
cartRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const items = await prisma.cartItem.findMany({
    where: {
      userId: req.user!.id,
      product: { isArchived: false },
    },
    include: { product: true },
    orderBy: { createdAt: 'asc' },
  });

  const formatted = items.map(formatCartItem);
  const totalCount = formatted.reduce((sum, item) => sum + item.quantity, 0);

  res.status(200).json({ data: { items: formatted, totalCount } });
});

// POST /api/cart/items - Add item to cart
cartRouter.post('/items', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { productId, quantity = 1, selectedColor = '', selectedSize = '' } = req.body;

  if (!productId || typeof productId !== 'string') {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'productId is required' } });
    return;
  }

  const numQty = parseInt(quantity, 10);
  if (isNaN(numQty) || numQty <= 0) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Quantity must be a positive integer' } });
    return;
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.isArchived) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found or unavailable' } });
    return;
  }

  if (product.stock <= 0) {
    res.status(400).json({ error: { code: 'OUT_OF_STOCK', message: 'This item is currently out of stock' } });
    return;
  }

  const colorKey = typeof selectedColor === 'string' ? selectedColor.trim() : '';
  const sizeKey = typeof selectedSize === 'string' ? selectedSize.trim() : '';

  // Check if item already in cart
  const existing = await prisma.cartItem.findUnique({
    where: {
      userId_productId_selectedColor_selectedSize: {
        userId: req.user!.id,
        productId,
        selectedColor: colorKey,
        selectedSize: sizeKey,
      },
    },
  });

  const newQty = existing
    ? Math.min(existing.quantity + numQty, product.stock)
    : Math.min(numQty, product.stock);

  const cartItem = await prisma.cartItem.upsert({
    where: {
      userId_productId_selectedColor_selectedSize: {
        userId: req.user!.id,
        productId,
        selectedColor: colorKey,
        selectedSize: sizeKey,
      },
    },
    update: { quantity: newQty },
    create: {
      userId: req.user!.id,
      productId,
      selectedColor: colorKey,
      selectedSize: sizeKey,
      quantity: newQty,
    },
    include: { product: true },
  });

  res.status(201).json({ data: { item: formatCartItem(cartItem) } });
});

// PATCH /api/cart/items/:id - Update item quantity
cartRouter.patch('/items/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const itemId = req.params.id;
  const { quantity } = req.body;

  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { product: true },
  });

  if (!item || item.userId !== req.user!.id) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Cart item not found' } });
    return;
  }

  const numQty = parseInt(quantity, 10);
  if (isNaN(numQty) || numQty <= 0) {
    // Zero or negative deletes item
    await prisma.cartItem.delete({ where: { id: itemId } });
    res.status(200).json({ data: { message: 'Item removed from cart' } });
    return;
  }

  const clampedQty = Math.min(numQty, item.product.stock);
  const updated = await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity: clampedQty },
    include: { product: true },
  });

  res.status(200).json({ data: { item: formatCartItem(updated) } });
});

// DELETE /api/cart/items/:id - Delete single item
cartRouter.delete('/items/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const itemId = req.params.id;
  const item = await prisma.cartItem.findUnique({ where: { id: itemId } });

  if (!item || item.userId !== req.user!.id) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Cart item not found' } });
    return;
  }

  await prisma.cartItem.delete({ where: { id: itemId } });
  res.status(200).json({ data: { message: 'Item removed from cart' } });
});

// DELETE /api/cart - Clear entire cart
cartRouter.delete('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await prisma.cartItem.deleteMany({ where: { userId: req.user!.id } });
  res.status(200).json({ data: { message: 'Cart cleared successfully' } });
});

// POST /api/cart/merge - Safe guest cart merge upon login
cartRouter.post('/merge', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { items } = req.body;
  if (!Array.isArray(items)) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Items array is required' } });
    return;
  }

  for (const item of items) {
    if (!item.productId) continue;
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product || product.isArchived || product.stock <= 0) continue;

    const colorKey = typeof item.selectedColor === 'string' ? item.selectedColor.trim() : '';
    const sizeKey = typeof item.selectedSize === 'string' ? item.selectedSize.trim() : '';
    const numQty = parseInt(item.quantity, 10) || 1;

    const existing = await prisma.cartItem.findUnique({
      where: {
        userId_productId_selectedColor_selectedSize: {
          userId: req.user!.id,
          productId: item.productId,
          selectedColor: colorKey,
          selectedSize: sizeKey,
        },
      },
    });

    const finalQty = existing
      ? Math.min(existing.quantity + numQty, product.stock)
      : Math.min(numQty, product.stock);

    await prisma.cartItem.upsert({
      where: {
        userId_productId_selectedColor_selectedSize: {
          userId: req.user!.id,
          productId: item.productId,
          selectedColor: colorKey,
          selectedSize: sizeKey,
        },
      },
      update: { quantity: finalQty },
      create: {
        userId: req.user!.id,
        productId: item.productId,
        selectedColor: colorKey,
        selectedSize: sizeKey,
        quantity: finalQty,
      },
    });
  }

  const updatedCart = await prisma.cartItem.findMany({
    where: { userId: req.user!.id, product: { isArchived: false } },
    include: { product: true },
    orderBy: { createdAt: 'asc' },
  });

  res.status(200).json({ data: { items: updatedCart.map(formatCartItem) } });
});
