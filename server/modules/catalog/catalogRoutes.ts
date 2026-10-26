import { Router, Request, Response } from 'express';
import { prisma } from '../../db/prisma.js';
import { optionalAuth, requireAuth, AuthenticatedRequest } from '../../middleware/auth.js';
import { Prisma } from '@prisma/client';

export const catalogRouter = Router();

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

// GET /api/products - Search, filter, sort, paginate
catalogRouter.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    category,
    search,
    minPrice,
    maxPrice,
    sort = 'featured',
    page = '1',
    pageSize = '50',
    trending,
    bestSeller,
    newArrival,
    dealOfDay,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const sizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 50));
  const skip = (pageNum - 1) * sizeNum;

  const where: Prisma.ProductWhereInput = {
    isArchived: false,
  };

  if (category && typeof category === 'string' && category.toLowerCase() !== 'all') {
    where.category = { equals: category, mode: 'insensitive' };
  }

  if (search && typeof search === 'string' && search.trim() !== '') {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { brand: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) {
      const minMinor = Math.round(parseFloat(minPrice as string) * 100);
      if (!isNaN(minMinor)) where.price.gte = minMinor;
    }
    if (maxPrice !== undefined) {
      const maxMinor = Math.round(parseFloat(maxPrice as string) * 100);
      if (!isNaN(maxMinor)) where.price.lte = maxMinor;
    }
  }

  if (trending === 'true') where.isTrending = true;
  if (bestSeller === 'true') where.isBestSeller = true;
  if (newArrival === 'true') where.isNewArrival = true;
  if (dealOfDay === 'true') where.isDealOfDay = true;

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
  switch (sort) {
    case 'price_asc':
      orderBy = { price: 'asc' };
      break;
    case 'price_desc':
      orderBy = { price: 'desc' };
      break;
    case 'rating':
      orderBy = { rating: 'desc' };
      break;
    case 'newest':
      orderBy = { createdAt: 'desc' };
      break;
    case 'featured':
    default:
      orderBy = { isBestSeller: 'desc' };
      break;
  }

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: sizeNum,
    }),
  ]);

  res.status(200).json({
    data: {
      products: products.map(formatProduct),
      total,
      page: pageNum,
      pageSize: sizeNum,
      totalPages: Math.ceil(total / sizeNum),
    },
  });
});

// GET /api/products/:id - Single product details
catalogRouter.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
  });

  if (!product || (product.isArchived && req.user?.role !== 'ADMIN')) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
    return;
  }

  res.status(200).json({
    data: { product: formatProduct(product) },
  });
});

// GET /api/products/:id/reviews - Public product reviews
catalogRouter.get('/:id/reviews', async (req: Request, res: Response): Promise<void> => {
  const reviews = await prisma.review.findMany({
    where: { productId: req.params.id },
    include: { user: { select: { name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const formattedReviews = reviews.map((r) => ({
    id: r.id,
    userName: r.user.name,
    userAvatar: r.user.avatarUrl || '',
    rating: r.rating,
    date: r.createdAt.toISOString(),
    title: r.title,
    comment: r.comment,
    verifiedPurchase: r.verifiedPurchase,
    helpfulCount: r.helpfulCount,
  }));

  res.status(200).json({ data: { reviews: formattedReviews } });
});

// POST /api/products/:id/reviews - Authenticated customer review with verified purchase check
catalogRouter.post('/:id/reviews', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { rating, title, comment } = req.body;
  const productId = req.params.id;

  const numRating = parseInt(rating, 10);
  if (isNaN(numRating) || numRating < 1 || numRating > 5) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Rating must be an integer between 1 and 5' } });
    return;
  }

  if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Comment is required' } });
    return;
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.isArchived) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
    return;
  }

  // Check if customer has verified purchase in a completed/delivered or paid order
  const orderWithItem = await prisma.order.findFirst({
    where: {
      userId: req.user!.id,
      items: { some: { productId } },
      OR: [{ paymentStatus: 'Paid' }, { status: 'Delivered' }],
    },
  });
  const verifiedPurchase = Boolean(orderWithItem);

  const sanitizedTitle = typeof title === 'string' ? title.trim().slice(0, 120) : '';
  const sanitizedComment = comment.trim().slice(0, 2000);

  const createdReview = await prisma.$transaction(async (tx) => {
    const review = await tx.review.upsert({
      where: {
        productId_userId: {
          productId,
          userId: req.user!.id,
        },
      },
      update: {
        rating: numRating,
        title: sanitizedTitle,
        comment: sanitizedComment,
        verifiedPurchase,
      },
      create: {
        productId,
        userId: req.user!.id,
        rating: numRating,
        title: sanitizedTitle,
        comment: sanitizedComment,
        verifiedPurchase,
      },
      include: { user: { select: { name: true, avatarUrl: true } } },
    });

    // Recalculate average rating
    const aggregate = await tx.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const avgRating = Number((aggregate._avg.rating || 0).toFixed(1));
    const count = aggregate._count.rating || 0;

    await tx.product.update({
      where: { id: productId },
      data: {
        rating: avgRating,
        reviewCount: count,
      },
    });

    return review;
  });

  res.status(201).json({
    data: {
      review: {
        id: createdReview.id,
        userName: createdReview.user.name,
        userAvatar: createdReview.user.avatarUrl || '',
        rating: createdReview.rating,
        date: createdReview.createdAt.toISOString(),
        title: createdReview.title,
        comment: createdReview.comment,
        verifiedPurchase: createdReview.verifiedPurchase,
        helpfulCount: createdReview.helpfulCount,
      },
    },
  });
});

// POST /api/products/:id/reviews/:reviewId/helpful - Increment helpful count for a review
catalogRouter.post('/:id/reviews/:reviewId/helpful', async (req: Request, res: Response): Promise<void> => {
  const { id: productId, reviewId } = req.params;

  const review = await prisma.review.findFirst({
    where: { id: reviewId, productId },
  });

  if (!review) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Review not found' } });
    return;
  }

  const updatedReview = await prisma.review.update({
    where: { id: reviewId },
    data: { helpfulCount: { increment: 1 } },
  });

  res.status(200).json({
    data: {
      reviewId: updatedReview.id,
      helpfulCount: updatedReview.helpfulCount,
    },
  });
});
