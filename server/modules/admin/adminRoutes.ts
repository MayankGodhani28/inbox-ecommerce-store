import { Router, Response } from 'express';
import { prisma } from '../../db/prisma.js';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../../middleware/auth.js';
import { formatOrder } from '../orders/orderRoutes.js';

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

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
    isArchived: p.isArchived,
    createdAt: p.createdAt.toISOString(),
  };
}

function getSellerProductFilter(user: any) {
  const filters: any[] = [
    { specifications: { path: ['sellerEmail'], equals: user.email } },
    { specifications: { path: ['sellerId'], equals: user.id } },
  ];
  return { OR: filters };
}

// GET /api/admin/products - List products created by the current merchant
adminRouter.get('/products', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const where: any = getSellerProductFilter(user);

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  res.status(200).json({ data: { products: products.map(formatProduct) } });
});

// POST /api/admin/products - Add product linked to current merchant
adminRouter.post('/products', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const {
    name,
    brand,
    category,
    description,
    price,
    originalPrice,
    discount,
    stock,
    images,
    colors,
    sizes,
    specifications,
    isTrending,
    isBestSeller,
    isNewArrival,
    isDealOfDay,
  } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Product name is required' } });
    return;
  }

  const numPrice = parseFloat(price);
  if (isNaN(numPrice) || numPrice <= 0) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Price must be a positive number' } });
    return;
  }

  const numStock = parseInt(stock, 10);
  if (isNaN(numStock) || numStock < 0) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Stock must be greater than or equal to 0' } });
    return;
  }

  // Validate images are valid URLs
  const imageList = Array.isArray(images) && images.length > 0 ? images : [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
  ];
  const urlRegex = /^https?:\/\//i;
  for (const img of imageList) {
    if (typeof img !== 'string' || !urlRegex.test(img)) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: `Invalid image URL: ${img}` } });
      return;
    }
  }

  const priceMinor = Math.round(numPrice * 100);
  const origPriceMinor = originalPrice ? Math.round(parseFloat(originalPrice) * 100) : priceMinor;
  const sellerStore = (user.storeName || brand || 'Inbox').trim();

  const newProduct = await prisma.product.create({
    data: {
      id: `prod-custom-${Date.now()}`,
      name: name.trim(),
      brand: (brand || sellerStore).trim(),
      category: (category || 'Electronics').trim(),
      description: (description || '').trim(),
      price: priceMinor,
      originalPrice: origPriceMinor,
      discount: discount ? parseInt(discount, 10) || 0 : 0,
      stock: numStock,
      images: imageList,
      colors: Array.isArray(colors) ? colors : [],
      sizes: Array.isArray(sizes) ? sizes : [],
      specifications: {
        ...(typeof specifications === 'object' && specifications !== null ? specifications : {}),
        sellerId: user.id,
        sellerEmail: user.email,
        storeName: sellerStore,
      },
      isTrending: Boolean(isTrending),
      isBestSeller: Boolean(isBestSeller),
      isNewArrival: Boolean(isNewArrival),
      isDealOfDay: Boolean(isDealOfDay),
      isArchived: false,
    },
  });

  res.status(201).json({ data: { product: formatProduct(newProduct) } });
});

// PATCH /api/admin/products/:id - Update product
adminRouter.patch('/products/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
    return;
  }

  // Multi-tenant check: ensure merchant only modifies their own products
  const specs = (existing.specifications as any) || {};
  const isOwner =
    specs.sellerEmail === user.email ||
    specs.sellerId === user.id ||
    (user.storeName && existing.brand.toLowerCase() === user.storeName.toLowerCase() && specs.sellerEmail === user.email);
  if (!isOwner) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only update products from your own catalog' } });
    return;
  }

  const updates: Record<string, any> = {};
  const {
    name,
    brand,
    category,
    description,
    price,
    originalPrice,
    discount,
    stock,
    images,
    colors,
    sizes,
    specifications,
    isTrending,
    isBestSeller,
    isNewArrival,
    isDealOfDay,
    isArchived,
  } = req.body;

  if (name !== undefined) updates.name = name.trim();
  if (brand !== undefined) updates.brand = brand.trim();
  if (category !== undefined) updates.category = category.trim();
  if (description !== undefined) updates.description = description.trim();

  if (price !== undefined) {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Price must be positive' } });
      return;
    }
    updates.price = Math.round(numPrice * 100);
  }

  if (originalPrice !== undefined) {
    updates.originalPrice = Math.round(parseFloat(originalPrice) * 100);
  }

  if (stock !== undefined) {
    const numStock = parseInt(stock, 10);
    if (isNaN(numStock) || numStock < 0) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Stock must be >= 0' } });
      return;
    }
    updates.stock = numStock;
  }

  if (images !== undefined) {
    if (!Array.isArray(images)) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Images must be an array' } });
      return;
    }
    updates.images = images;
  }

  if (colors !== undefined) updates.colors = colors;
  if (sizes !== undefined) updates.sizes = sizes;
  if (specifications !== undefined) updates.specifications = specifications;
  if (discount !== undefined) updates.discount = parseInt(discount, 10) || 0;
  if (isTrending !== undefined) updates.isTrending = Boolean(isTrending);
  if (isBestSeller !== undefined) updates.isBestSeller = Boolean(isBestSeller);
  if (isNewArrival !== undefined) updates.isNewArrival = Boolean(isNewArrival);
  if (isDealOfDay !== undefined) updates.isDealOfDay = Boolean(isDealOfDay);
  if (isArchived !== undefined) updates.isArchived = Boolean(isArchived);

  const updated = await prisma.product.update({
    where: { id: req.params.id },
    data: updates,
  });

  res.status(200).json({ data: { product: formatProduct(updated) } });
});

// DELETE /api/admin/products/:id - Soft-archive product safely
adminRouter.delete('/products/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
    return;
  }

  // Multi-tenant check: ensure merchant only deletes their own products
  const specs = (existing.specifications as any) || {};
  const isOwner =
    specs.sellerEmail === user.email ||
    specs.sellerId === user.id ||
    (user.storeName && existing.brand.toLowerCase() === user.storeName.toLowerCase() && specs.sellerEmail === user.email);
  if (!isOwner) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only archive products from your own catalog' } });
    return;
  }

  await prisma.product.update({
    where: { id: req.params.id },
    data: { isArchived: true },
  });

  res.status(200).json({ data: { message: 'Product archived successfully' } });
});

// GET /api/admin/orders - List orders isolated to current merchant
adminRouter.get('/orders', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;

  // Find products belonging to this seller
  const sellerProducts = await prisma.product.findMany({
    where: getSellerProductFilter(user),
    select: { id: true },
  });
  const sellerProductIds = sellerProducts.map((p) => p.id);

  if (sellerProductIds.length === 0) {
    res.status(200).json({ data: { orders: [] } });
    return;
  }

  const orders = await prisma.order.findMany({
    where: {
      items: {
        some: {
          productId: { in: sellerProductIds },
        },
      },
    },
    include: { items: true, statusHistory: true },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ data: { orders: orders.map(formatOrder) } });
});

// GET /api/admin/metrics - Authoritative aggregated dashboard metrics (isolated to current merchant)
adminRouter.get('/metrics', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;

  // Merchant seller isolated metrics
  const sellerProducts = await prisma.product.findMany({
    where: getSellerProductFilter(user),
    select: { id: true, stock: true, isArchived: true },
  });
  const sellerProductIds = sellerProducts.map((p) => p.id);

  if (sellerProductIds.length === 0) {
    res.status(200).json({
      data: {
        metrics: {
          paidRevenue: 0,
          paidRevenueMinor: 0,
          totalOrders: 0,
          pendingOrders: 0,
          unpaidCodOrders: 0,
          lowStockCount: 0,
          totalCustomers: 0,
        },
      },
    });
    return;
  }

  const sellerOrders = await prisma.order.findMany({
    where: {
      items: {
        some: { productId: { in: sellerProductIds } },
      },
    },
    include: { items: true },
  });

  const paidRevenueMinor = sellerOrders
    .filter((o) => o.paymentStatus === 'Paid')
    .reduce((sum, o) => {
      const sellerItemsTotal = o.items
        .filter((it) => sellerProductIds.includes(it.productId))
        .reduce((s, it) => s + it.totalPrice, 0);
      return sum + sellerItemsTotal;
    }, 0);

  const totalOrders = sellerOrders.length;
  const pendingOrders = sellerOrders.filter((o) => ['Order Placed', 'Confirmed'].includes(o.status)).length;
  const unpaidCodOrders = sellerOrders.filter(
    (o) => o.paymentMethod === 'Cash on Delivery' && o.paymentStatus === 'Pending'
  ).length;

  const lowStockCount = sellerProducts.filter((p) => !p.isArchived && p.stock <= 10).length;
  const customerIds = new Set(sellerOrders.map((o) => o.userId));

  res.status(200).json({
    data: {
      metrics: {
        paidRevenue: paidRevenueMinor / 100,
        paidRevenueMinor,
        totalOrders,
        pendingOrders,
        unpaidCodOrders,
        lowStockCount,
        totalCustomers: customerIds.size,
      },
    },
  });
});

// GET /api/admin/customers - List registered customer accounts with order metrics (isolated to current merchant)
adminRouter.get('/customers', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;

  // Merchant seller customers: only customers who ordered this seller's products
  const sellerProducts = await prisma.product.findMany({
    where: getSellerProductFilter(user),
    select: { id: true },
  });
  const sellerProductIds = sellerProducts.map((p) => p.id);

  if (sellerProductIds.length === 0) {
    res.status(200).json({ data: { customers: [] } });
    return;
  }

  const sellerOrders = await prisma.order.findMany({
    where: {
      items: { some: { productId: { in: sellerProductIds } } },
    },
    include: { items: true, user: true },
  });

  const customerMap = new Map<string, any>();
  for (const o of sellerOrders) {
    const u = o.user;
    if (!u) continue;
    const sellerItemsTotal = o.items
      .filter((it) => sellerProductIds.includes(it.productId))
      .reduce((s, it) => s + it.totalPrice, 0);

    const existing = customerMap.get(u.id) || {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || 'N/A',
      role: u.role.toLowerCase(),
      avatarUrl: u.avatarUrl,
      orderCount: 0,
      totalSpent: 0,
      createdAt: u.createdAt.toISOString(),
    };

    existing.orderCount += 1;
    if (o.paymentStatus === 'Paid') {
      existing.totalSpent += sellerItemsTotal / 100;
    }
    customerMap.set(u.id, existing);
  }

  res.status(200).json({ data: { customers: Array.from(customerMap.values()) } });
});
