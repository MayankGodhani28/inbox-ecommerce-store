import { Router, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../../db/prisma.js';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../../middleware/auth.js';
import { calculateAuthoritativeQuote } from '../checkout/pricingService.js';

export const orderRouter = Router();

export function formatOrder(o: any) {
  const store = o.user?.storeName?.trim().toLowerCase();
  const isStore = (val?: string | null) => Boolean(val && store && val.trim().toLowerCase() === store);

  let resolvedCustomerName =
    (!isStore(o.customerName) && o.customerName) ||
    (!isStore(o.shippingAddress?.fullName) && o.shippingAddress?.fullName) ||
    (!isStore(o.user?.name) && o.user?.name);

  if (!resolvedCustomerName) {
    if (o.customerEmail && typeof o.customerEmail === 'string') {
      const prefix = o.customerEmail.split('@')[0];
      resolvedCustomerName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    } else {
      resolvedCustomerName = o.customerName || 'Customer';
    }
  }

  return {
    id: o.orderNumber || o.id,
    internalId: o.id,
    orderNumber: o.orderNumber,
    userId: o.userId,
    customerName: resolvedCustomerName,
    customerEmail: o.customerEmail,
    customerPhone: o.customerPhone,
    date: o.createdAt.toISOString(),
    currency: o.currency || 'USD',
    subtotal: o.subtotal / 100,
    subtotalMinor: o.subtotal,
    discount: o.discount / 100,
    discountMinor: o.discount,
    deliveryFee: o.deliveryFee / 100,
    deliveryFeeMinor: o.deliveryFee,
    tax: o.tax / 100,
    taxMinor: o.tax,
    total: o.total / 100,
    totalMinor: o.total,
    couponCode: o.couponCode || undefined,
    shippingAddress: o.shippingAddress,
    deliveryMethod: o.deliveryMethod as 'Standard' | 'Express',
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus as 'Paid' | 'Pending',
    transactionId: o.transactionId || undefined,
    status: o.status,
    statusHistory: Array.isArray(o.statusHistory)
      ? o.statusHistory.map((h: any) => ({
          status: h.status,
          timestamp: h.createdAt.toISOString(),
          note: h.note || '',
        }))
      : [],
    trackingNumber: o.trackingNumber || undefined,
    estimatedDeliveryDate: o.estimatedDeliveryDate
      ? o.estimatedDeliveryDate.toISOString().split('T')[0]
      : undefined,
    items: Array.isArray(o.items)
      ? o.items.map((it: any) => ({
          productId: it.productId || '',
          name: it.name,
          price: it.unitPrice / 100,
          unitPriceMinor: it.unitPrice,
          quantity: it.quantity,
          totalPrice: it.totalPrice / 100,
          totalPriceMinor: it.totalPrice,
          image: it.image,
          selectedColor: it.selectedColor || undefined,
          selectedSize: it.selectedSize || undefined,
        }))
      : [],
  };
}

// POST /api/orders - Create order with transactional inventory decrement & idempotency
orderRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const {
    items: requestItems,
    shippingAddress,
    deliveryMethod = 'Standard',
    paymentMethod = 'Cash on Delivery',
    couponCode,
    expectedTotalMinor,
    customerName,
    customerEmail,
    customerPhone,
  } = req.body;

  // Idempotency key from header or body
  const rawIdempotencyKey = (req.headers['idempotency-key'] as string) || req.body.idempotencyKey;
  const idempotencyKey = rawIdempotencyKey ? rawIdempotencyKey.trim() : `auto_${crypto.randomUUID()}`;

  // Deterministic payload hash
  const payloadHash = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        userId,
        items: requestItems || [],
        shippingAddress: shippingAddress || {},
        deliveryMethod,
        paymentMethod,
        couponCode: couponCode ? couponCode.trim().toUpperCase() : '',
      })
    )
    .digest('hex');

  // Check idempotency table
  const existingRequest = await prisma.checkoutRequest.findUnique({
    where: { idempotencyKey },
    include: {
      order: {
        include: { items: true, statusHistory: true },
      },
    },
  });

  if (existingRequest) {
    if (existingRequest.userId !== userId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Idempotency key belongs to another user' } });
      return;
    }

    if (existingRequest.payloadHash !== payloadHash) {
      res.status(400).json({
        error: {
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'Idempotency key was previously used with different order payload',
        },
      });
      return;
    }

    if (existingRequest.status === 'COMPLETED' && existingRequest.order) {
      res.status(200).json({ data: { order: formatOrder(existingRequest.order), replayed: true } });
      return;
    }
  }

  // Address validation
  if (!shippingAddress || !shippingAddress.street || !shippingAddress.city) {
    res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Valid shippingAddress (street, city, etc.) is required' },
    });
    return;
  }

  // Calculate authoritative quote
  const quote = await calculateAuthoritativeQuote({
    items: requestItems,
    deliveryMethod,
    couponCode,
    userId,
  });

  if (quote.items.length === 0) {
    const errorMsg = quote.warnings.length > 0
      ? quote.warnings.join(' ')
      : 'Cannot create an order with an empty cart';
    const errorCode = quote.warnings.length > 0 ? 'OUT_OF_STOCK' : 'EMPTY_CART';
    res.status(400).json({ error: { code: errorCode, message: errorMsg } });
    return;
  }

  // Detect pricing conflict
  if (expectedTotalMinor !== undefined && expectedTotalMinor !== null) {
    if (expectedTotalMinor !== quote.totalMinor) {
      res.status(409).json({
        error: {
          code: 'PRICE_CHANGED',
          message: 'Pricing has changed since checkout started. Please review your updated total.',
          expectedTotalMinor,
          actualTotalMinor: quote.totalMinor,
          quote,
        },
      });
      return;
    }
  }

  // Payment classification
  const isCOD =
    paymentMethod.toLowerCase().includes('cash') ||
    paymentMethod.toLowerCase().includes('cod');
  const paymentStatus = isCOD ? 'Pending' : 'Paid';
  const transactionId = isCOD ? null : req.body.transactionId || `TXN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  // Execute order creation transaction
  try {
    const createdOrder = await prisma.$transaction(async (tx) => {
      // 1. Verify and decrement inventory atomically for each product
      for (const item of quote.items) {
        const updateResult = await tx.product.updateMany({
          where: {
            id: item.productId,
            stock: { gte: item.quantity },
            isArchived: false,
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        if (updateResult.count === 0) {
          throw new Error(`Insufficient stock for "${item.name}". Please update your cart.`);
        }
      }

      // 2. Enforce coupon limits and record redemption
      if (quote.appliedCoupon) {
        const coupon = await tx.coupon.findUnique({
          where: { id: quote.appliedCoupon.id },
        });

        if (coupon && coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
          throw new Error(`Coupon "${coupon.code}" has reached its maximum usage limit.`);
        }

        if (coupon) {
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });

          await tx.couponRedemption.create({
            data: {
              couponId: coupon.id,
              userId,
            },
          });
        }
      }

      // 3. Generate unique orderNumber
      const orderNumber = `INB-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 4. Estimate delivery date
      const estDays = deliveryMethod === 'Express' ? 2 : 4;
      const estimatedDeliveryDate = new Date(Date.now() + estDays * 24 * 60 * 60 * 1000);

      const store = req.user?.storeName?.trim().toLowerCase();
      const isStore = (val?: string | null) => Boolean(val && store && val.trim().toLowerCase() === store);

      const resolvedCustomerName =
        (!isStore(customerName) && typeof customerName === 'string' && customerName.trim()) ||
        (!isStore(shippingAddress?.fullName) && typeof shippingAddress?.fullName === 'string' && shippingAddress.fullName.trim()) ||
        (!isStore(req.user?.name) && typeof req.user?.name === 'string' && req.user.name.trim()) ||
        (customerEmail ? String(customerEmail).split('@')[0] : null) ||
        (req.user?.email ? req.user.email.split('@')[0] : null) ||
        'Customer';

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          customerName: resolvedCustomerName,
          customerEmail: customerEmail || req.user!.email,
          customerPhone: customerPhone || req.user!.phone || '',
          currency: 'USD',
          subtotal: quote.subtotalMinor,
          discount: quote.discountMinor,
          deliveryFee: quote.deliveryFeeMinor,
          tax: quote.taxMinor,
          total: quote.totalMinor,
          couponCode: quote.appliedCoupon ? quote.appliedCoupon.code : null,
          shippingAddress,
          deliveryMethod,
          paymentMethod: isCOD ? 'Cash on Delivery' : paymentMethod,
          paymentStatus,
          transactionId,
          status: 'Order Placed',
          estimatedDeliveryDate,
          items: {
            create: quote.items.map((it) => ({
              productId: it.productId,
              name: it.name,
              image: it.image,
              selectedColor: it.selectedColor || null,
              selectedSize: it.selectedSize || null,
              unitPrice: it.priceMinor,
              quantity: it.quantity,
              totalPrice: it.lineTotalMinor,
            })),
          },
          statusHistory: {
            create: {
              status: 'Order Placed',
              note: isCOD
                ? 'Order created successfully with Cash on Delivery'
                : 'Order created and payment captured',
              actor: 'SYSTEM',
            },
          },
        },
        include: {
          items: true,
          statusHistory: true,
        },
      });

      // 6. Delete ordered items from user's CartItem table
      const orderedProductIds = quote.items.map((it) => it.productId);
      await tx.cartItem.deleteMany({
        where: {
          userId,
          productId: { in: orderedProductIds },
        },
      });

      // 7. Save idempotency record
      await tx.checkoutRequest.upsert({
        where: { idempotencyKey },
        update: { status: 'COMPLETED', orderId: order.id },
        create: {
          idempotencyKey,
          userId,
          payloadHash,
          status: 'COMPLETED',
          orderId: order.id,
        },
      });

      return order;
    });

    res.status(201).json({ data: { order: formatOrder(createdOrder) } });
  } catch (err: any) {
    res.status(400).json({
      error: {
        code: 'ORDER_CREATION_FAILED',
        message: err.message || 'Failed to complete order checkout',
      },
    });
  }
});

// GET /api/orders - List current user's orders
orderRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user!.id },
    include: { items: true, statusHistory: true },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ data: { orders: orders.map(formatOrder) } });
});

// GET /api/orders/:id - Get order by ID or orderNumber (owner or admin only)
orderRouter.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const idOrNumber = req.params.id;

  const order = await prisma.order.findFirst({
    where: {
      OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }],
    },
    include: { items: true, statusHistory: true },
  });

  if (!order) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
    return;
  }

  if (order.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    return;
  }

  res.status(200).json({ data: { order: formatOrder(order) } });
});

const FULFILLMENT_STAGES = [
  'Order Placed',
  'Confirmed',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
];

// PATCH /api/orders/:id/status - Admin order status transition & tracking update
orderRouter.patch('/:id/status', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const idOrNumber = req.params.id;
  const { status, note, trackingNumber } = req.body;

  const order = await prisma.order.findFirst({
    where: { OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }] },
  });

  if (!order) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
    return;
  }

  if (status) {
    const currentIdx = FULFILLMENT_STAGES.indexOf(order.status);
    const newIdx = FULFILLMENT_STAGES.indexOf(status);

    if (newIdx === -1) {
      res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: `Invalid fulfillment status "${status}". Allowed: ${FULFILLMENT_STAGES.join(', ')}`,
        },
      });
      return;
    }

    if (newIdx < currentIdx) {
      res.status(400).json({
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot transition backward from "${order.status}" to "${status}"`,
        },
      });
      return;
    }

    // Repeated update to exact same status with no tracking update is an idempotent no-op
    if (newIdx === currentIdx && (!trackingNumber || trackingNumber === order.trackingNumber)) {
      const existing = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: true, statusHistory: true },
      });
      res.status(200).json({ data: { order: formatOrder(existing) } });
      return;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const dataToUpdate: any = {};
    if (status) dataToUpdate.status = status;
    if (trackingNumber) dataToUpdate.trackingNumber = trackingNumber;

    if (status && status !== order.status) {
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status,
          note: note || `Status updated to ${status}`,
          actor: req.user!.name || 'ADMIN',
        },
      });
    }

    return tx.order.update({
      where: { id: order.id },
      data: dataToUpdate,
      include: { items: true, statusHistory: true },
    });
  });

  res.status(200).json({ data: { order: formatOrder(updated) } });
});

// PATCH /api/orders/:id/collect-payment - Admin payment collection for COD
orderRouter.patch('/:id/collect-payment', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const idOrNumber = req.params.id;

  const order = await prisma.order.findFirst({
    where: { OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }] },
  });

  if (!order) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
    return;
  }

  if (order.paymentStatus === 'Paid') {
    res.status(200).json({ data: { message: 'Order payment was already collected', order: formatOrder(order) } });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: order.status,
        note: `Cash on Delivery payment ($${(order.total / 100).toFixed(2)}) collected and audited.`,
        actor: req.user!.name || 'ADMIN',
      },
    });

    return tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'Paid',
        transactionId: `COD-COLLECTED-${Date.now()}`,
      },
      include: { items: true, statusHistory: true },
    });
  });

  res.status(200).json({ data: { order: formatOrder(updated) } });
});
