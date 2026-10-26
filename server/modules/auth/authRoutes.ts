import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../db/prisma.js';
import { Role } from '@prisma/client';
import {
  createSession,
  revokeSession,
  requireAuth,
  optionalAuth,
  AuthenticatedRequest,
  SESSION_COOKIE_NAME,
} from '../../middleware/auth.js';
import { csrfProtection, CSRF_COOKIE_NAME } from '../../middleware/csrf.js';

export const authRouter = Router();

// In-memory rate limiter for login attempts (15 min window, max 5 attempts per IP + email)
interface AttemptRecord {
  count: number;
  resetAt: number;
}
const loginAttempts = new Map<string, AttemptRecord>();

function checkRateLimit(key: string): { allowed: boolean; remainingSec: number } {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || now > record.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return { allowed: true, remainingSec: 0 };
  }

  if (record.count >= 5) {
    return { allowed: false, remainingSec: Math.ceil((record.resetAt - now) / 1000) };
  }

  record.count++;
  return { allowed: true, remainingSec: 0 };
}

function clearRateLimit(key: string) {
  loginAttempts.delete(key);
}

function sanitizeUser(user: {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  createdAt: Date;
  addresses?: any[];
  storeName?: string | null;
  sellerStatus?: any;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone || '',
    avatar: user.avatarUrl || '',
    role: user.role === Role.SUPER_ADMIN ? 'superadmin' : user.role === Role.ADMIN ? 'admin' : 'customer',
    addresses: user.addresses || [],
    createdAt: user.createdAt.toISOString(),
    storeName: user.storeName || undefined,
    sellerStatus: user.sellerStatus || undefined,
  };
}

// POST /api/auth/register
authRouter.post('/register', csrfProtection, async (req: Request, res: Response): Promise<void> => {
  const requestId = res.getHeader('x-request-id') as string;
  const { name, email, password, phone } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Name is required', requestId },
    });
    return;
  }

  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'A valid email address is required', requestId },
    });
    return;
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    res.status(400).json({
      error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters long', requestId },
    });
    return;
  }

  // Check duplicate email
  const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (existing) {
    res.status(409).json({
      error: { code: 'EMAIL_EXISTS', message: 'An account with this email address already exists.', requestId },
    });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Role is always CUSTOMER on public signup; any role in req.body is ignored
  const newUser = await prisma.user.create({
    data: {
      email: cleanEmail,
      name: name.trim(),
      phone: typeof phone === 'string' ? phone.trim() : null,
      passwordHash,
      role: Role.CUSTOMER,
    },
  });

  await createSession(newUser.id, res);

  res.status(201).json({
    data: {
      user: sanitizeUser(newUser),
      message: 'Account registered successfully',
    },
  });
});

// GET /api/auth/csrf-token - Read or refresh CSRF token
authRouter.get('/csrf-token', csrfProtection, (req: Request, res: Response): void => {
  res.status(200).json({
    data: {
      csrfToken: req.cookies?.[CSRF_COOKIE_NAME] || null,
    },
  });
});

// POST /api/auth/login
authRouter.post('/login', csrfProtection, async (req: Request, res: Response): Promise<void> => {
  const requestId = res.getHeader('x-request-id') as string;
  const { email, password } = req.body;

  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const throttleKey = `${ip}:${cleanEmail}`;

  const throttle = checkRateLimit(throttleKey);
  if (!throttle.allowed) {
    res.status(429).json({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: `Too many failed login attempts. Please try again in ${throttle.remainingSec} seconds.`,
        requestId,
      },
    });
    return;
  }

  if (!cleanEmail || !password || typeof password !== 'string') {
    res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Email and password are required', requestId },
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: cleanEmail },
    include: { addresses: true },
  });

  if (!user) {
    res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password', requestId },
    });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password', requestId },
    });
    return;
  }

  clearRateLimit(throttleKey);
  await createSession(user.id, res);

  res.status(200).json({
    data: {
      user: sanitizeUser(user),
      message: 'Logged in successfully',
    },
  });
});

// POST /api/auth/logout
authRouter.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (rawToken) {
    await revokeSession(rawToken, res);
  } else {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  }

  res.status(200).json({
    data: { message: 'Logged out successfully' },
  });
});

// GET /api/auth/me
authRouter.get('/me', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(200).json({
      data: {
        user: null,
      },
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { addresses: { orderBy: { createdAt: 'desc' } } },
  });

  if (!user) {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.status(200).json({
      data: {
        user: null,
      },
    });
    return;
  }

  res.status(200).json({
    data: {
      user: sanitizeUser(user),
    },
  });
});
