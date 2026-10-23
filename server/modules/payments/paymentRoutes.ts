import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import crypto from 'crypto';
import { prisma } from '../../db/prisma';
import { getEnv } from '../../config/env';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { calculateAuthoritativeQuote } from '../checkout/pricingService';

export const paymentRouter = Router();

function getStripeClient(): Stripe | null {
  const env = getEnv();
  if (!env.STRIPE_SECRET_KEY) return null;
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia' as any,
  });
}

// GET /api/payments/config - Expose public gateway configuration
paymentRouter.get('/config', (_req: Request, res: Response): void => {
  const env = getEnv();
  res.status(200).json({
    data: {
      provider: 'stripe',
      publishableKey: env.STRIPE_PUBLISHABLE_KEY || null,
      isEnabled: !!(env.STRIPE_SECRET_KEY && env.STRIPE_PUBLISHABLE_KEY),
    },
  });
});

// POST /api/payments/create-checkout-session - Create authenticated hosted Stripe Checkout session
paymentRouter.post('/create-checkout-session', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const stripe = getStripeClient();
  const env = getEnv();

  if (!stripe || !env.STRIPE_SECRET_KEY) {
    res.status(503).json({
      error: {
        code: 'PAYMENT_UNAVAILABLE',
        message: 'Stripe online payments are not currently configured. Please select Cash on Delivery or contact store support.',
      },
    });
    return;
  }

  const { items, shippingAddressId, shippingAddress, deliveryMethod = 'Standard', couponCode } = req.body;
  const user = req.user!;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Order must contain at least one item' } });
    return;
  }

  // 1. Resolve and verify shipping address
  let resolvedAddress: { street: string; city: string; state: string; postalCode: string; country: string; phone: string } | null = null;

  if (shippingAddressId) {
    const dbAddress = await prisma.address.findFirst({
      where: { id: shippingAddressId, userId: user.id },
    });
    if (dbAddress) {
      resolvedAddress = {
        street: dbAddress.street,
        city: dbAddress.city,
        state: dbAddress.state,
        postalCode: dbAddress.pincode,
        country: dbAddress.country,
        phone: dbAddress.phone,
      };
    }
  } else if (shippingAddress && shippingAddress.street && shippingAddress.city) {
    resolvedAddress = {
      street: shippingAddress.street,
      city: shippingAddress.city,
      state: shippingAddress.state || '',
      postalCode: shippingAddress.postalCode || shippingAddress.pincode || '',
      country: shippingAddress.country || 'India',
      phone: shippingAddress.phone || user.phone || '+1-555-0199',
    };
  }

  if (!resolvedAddress) {
    res.status(400).json({ error: { code: 'INVALID_ADDRESS', message: 'Valid shipping address required' } });
    return;
  }

  // 2. Authoritative quotation in minor units
  const quote = await calculateAuthoritativeQuote({
    items,
    deliveryMethod: deliveryMethod === 'Express' ? 'Express' : 'Standard',
    couponCode,
    userId: user.id,
  });

  // 3. Generate collision-resistant order number
  const orderNumber = `INB-ST-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    // 4. Create pending order transactionally with stock reservation
    const order = await prisma.$transaction(async (tx) => {
      // Check stock availability and reserve atomically
      for (const it of quote.items) {
        const updateResult = await tx.product.updateMany({
          where: {
            id: it.productId,
            stock: { gte: it.quantity },
            isArchived: false,
          },
          data: {
            stock: { decrement: it.quantity },
          },
        });
        if (updateResult.count === 0) {
          throw new Error(`Insufficient stock for "${it.name}". Please update your cart.`);
        }
      }

      // Create Order in PENDING status
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          customerName: user.name,
          customerEmail: user.email,
          customerPhone: resolvedAddress.phone,
          currency: 'USD',
          subtotal: quote.subtotalMinor,
          discount: quote.discountMinor,
          deliveryFee: quote.deliveryFeeMinor,
          tax: quote.taxMinor,
          total: quote.totalMinor,
          couponCode: quote.appliedCoupon?.code || null,
          shippingAddress: {
            street: resolvedAddress.street,
            city: resolvedAddress.city,
            state: resolvedAddress.state,
            postalCode: resolvedAddress.postalCode,
            country: resolvedAddress.country,
          },
          deliveryMethod: quote.deliveryMethod,
          paymentMethod: 'STRIPE',
          paymentStatus: 'Pending',
          status: 'Order Placed',
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
              actor: user.name || 'CUSTOMER',
              note: 'Checkout session initiated with Stripe',
            },
          },
        },
      });

      return createdOrder;
    });

    // 5. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      client_reference_id: order.orderNumber,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: order.total,
            product_data: {
              name: `Order ${order.orderNumber} - Inbox Emporium`,
              description: `${quote.items.length} item(s) • Shipping: ${order.deliveryMethod}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${env.CLIENT_ORIGIN}/?tab=order-success&orderId=${order.orderNumber}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.CLIENT_ORIGIN}/?tab=checkout&canceled=true&orderNumber=${order.orderNumber}`,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: user.id,
      },
    });

    // Link transaction reference
    await prisma.order.update({
      where: { id: order.id },
      data: { transactionId: session.id },
    });

    res.status(200).json({
      data: {
        sessionId: session.id,
        url: session.url,
        orderNumber: order.orderNumber,
      },
    });
  } catch (err: any) {
    console.error('[Stripe] Checkout session creation failed:', err);
    res.status(400).json({
      error: {
        code: 'CHECKOUT_SESSION_FAILED',
        message: err.message || 'Unable to initialize payment checkout session',
      },
    });
  }
});

// POST /api/payments/webhook - Stripe Webhook handler with verified signatures
paymentRouter.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const stripe = getStripeClient();
  const env = getEnv();

  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    res.status(503).json({ error: { code: 'NOT_CONFIGURED', message: 'Stripe webhook secret not configured' } });
    return;
  }

  const sig = req.headers['stripe-signature'] as string;
  const rawBody = (req as any).rawBody;

  if (!sig || !rawBody) {
    res.status(400).json({ error: { code: 'INVALID_SIGNATURE', message: 'Missing Stripe signature or payload' } });
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    res.status(400).json({ error: { code: 'BAD_SIGNATURE', message: `Webhook Error: ${err.message}` } });
    return;
  }

  // Handle verified events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderNumber = session.client_reference_id || session.metadata?.orderNumber;

      if (!orderNumber) {
        console.warn('[Stripe Webhook] checkout.session.completed missing orderNumber');
        break;
      }

      const order = await prisma.order.findUnique({
        where: { orderNumber },
        include: { items: true },
      });

      if (!order) {
        console.error(`[Stripe Webhook] Order ${orderNumber} not found`);
        break;
      }

      // Idempotency check: Already marked Paid
      if (order.paymentStatus === 'Paid') {
        console.log(`[Stripe Webhook] Order ${orderNumber} is already Paid. Skipping.`);
        break;
      }

      // Verify amount match (session.amount_total is in cents)
      if (session.amount_total !== null && session.amount_total !== order.total) {
        console.error(`[Stripe Webhook] Amount mismatch for ${orderNumber}: session=${session.amount_total}, order=${order.total}`);
        break;
      }

      // Mark order Paid and append audit history
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'Paid',
            transactionId: (session.payment_intent as string) || session.id,
            status: 'Confirmed',
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: 'Confirmed',
            actor: 'SYSTEM',
            note: `Stripe payment verified ($${(order.total / 100).toFixed(2)}) via session ${session.id}`,
          },
        });

        // Clear ordered items from customer's cart
        for (const item of order.items) {
          if (item.productId) {
            await tx.cartItem.deleteMany({
              where: {
                userId: order.userId,
                productId: item.productId,
              },
            });
          }
        }
      });

      console.log(`✓ [Stripe Webhook] Order ${orderNumber} marked Paid and Confirmed.`);
      break;
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent;
      const order = await prisma.order.findFirst({
        where: { transactionId: intent.id },
        include: { items: true },
      });

      if (order && order.paymentStatus !== 'Paid') {
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: { paymentStatus: 'Failed' },
          });

          // Release reserved stock back to inventory
          for (const it of order.items) {
            if (it.productId) {
              await tx.product.update({
                where: { id: it.productId },
                data: { stock: { increment: it.quantity } },
              });
            }
          }

          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              status: order.status,
              actor: 'SYSTEM',
              note: `Payment failed on Stripe: ${intent.last_payment_error?.message || 'Transaction declined'}`,
            },
          });
        });

        console.log(`[Stripe Webhook] Order ${order.orderNumber} payment failed; stock restored.`);
      }
      break;
    }

    default:
      // Other unhandled event types
      break;
  }

  res.status(200).json({ received: true });
});
