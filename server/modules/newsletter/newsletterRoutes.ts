import { Router, Request, Response } from 'express';
import { prisma } from '../../db/prisma';

export const newsletterRouter = Router();

// Email format regex RFC 5322 standard simplification
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// POST /api/newsletter/subscribe - Subscribe email to newsletter
newsletterRouter.post('/subscribe', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Email address is required' } });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(normalizedEmail) || normalizedEmail.length > 255) {
    res.status(400).json({ error: { code: 'INVALID_EMAIL', message: 'Please provide a valid email address' } });
    return;
  }

  try {
    const subscription = await prisma.newsletterSubscription.upsert({
      where: { email: normalizedEmail },
      update: { isActive: true },
      create: { email: normalizedEmail, isActive: true },
    });

    res.status(200).json({
      data: {
        subscribed: true,
        email: subscription.email,
        subscribedAt: subscription.subscribedAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[Newsletter] Subscription error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Unable to process subscription' } });
  }
});

// GET /api/newsletter/status - Optional check for active subscription
newsletterRouter.get('/status', async (req: Request, res: Response): Promise<void> => {
  const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
  if (!email) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Email is required' } });
    return;
  }

  const sub = await prisma.newsletterSubscription.findUnique({
    where: { email },
  });

  res.status(200).json({
    data: {
      isSubscribed: Boolean(sub?.isActive),
    },
  });
});
