import { Router, Response } from 'express';
import { prisma } from '../../db/prisma.js';
import { optionalAuth, AuthenticatedRequest } from '../../middleware/auth.js';
import { calculateAuthoritativeQuote } from './pricingService.js';

export const checkoutRouter = Router();

// POST /api/checkout/quote - Authoritative pricing quote calculation
checkoutRouter.post('/quote', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { items, deliveryMethod, couponCode } = req.body;

  const quote = await calculateAuthoritativeQuote({
    items,
    deliveryMethod,
    couponCode,
    userId: req.user?.id,
  });

  res.status(200).json({ data: quote });
});

// GET /api/coupons - List all active public coupons
checkoutRouter.get('/coupons', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const coupons = await prisma.coupon.findMany({
    where: { isActive: true },
    orderBy: { discountPercentage: 'asc' },
  });

  const formatted = coupons.map((c) => ({
    id: c.id,
    code: c.code,
    description: c.description,
    discountPercentage: c.discountPercentage,
    minSpend: c.minSpend / 100,
    maxDiscount: c.maxDiscount ? c.maxDiscount / 100 : undefined,
    freeShipping: c.freeShipping,
  }));

  res.status(200).json({ data: { coupons: formatted } });
});

// POST /api/coupons/validate - Validate a specific coupon against subtotal or current cart
checkoutRouter.post('/coupons/validate', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { code, subtotal, items, deliveryMethod } = req.body;

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Coupon code is required' } });
    return;
  }

  const quote = await calculateAuthoritativeQuote({
    items,
    deliveryMethod,
    couponCode: code.trim(),
    userId: req.user?.id,
  });

  if (quote.couponError) {
    res.status(400).json({
      error: {
        code: 'COUPON_INVALID',
        message: quote.couponError,
      },
    });
    return;
  }

  res.status(200).json({
    data: {
      coupon: quote.appliedCoupon,
      discount: quote.discount,
      quote,
    },
  });
});
