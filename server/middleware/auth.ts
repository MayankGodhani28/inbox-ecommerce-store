import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { User, Role } from '@prisma/client';

export const SESSION_COOKIE_NAME = 'inbox_session_id';
const SESSION_EXPIRY_DAYS = 1; // 1-day time limit (24 hours)

export interface AuthenticatedRequest extends Request {
  user?: User;
  sessionToken?: string;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string, res: Response): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  });

  return rawToken;
}

export async function revokeSession(rawToken: string, res: Response): Promise<void> {
  const tokenHash = hashToken(rawToken);
  try {
    await prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch (err) {
    console.error('[Session] Error revoking session:', err);
  }

  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    path: '/',
  });
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
  const requestId = res.getHeader('x-request-id') as string;

  if (!rawToken) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please log in.',
        requestId,
      },
    });
    return;
  }

  const tokenHash = hashToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    // Session is invalid, expired, or revoked
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.status(401).json({
      error: {
        code: 'SESSION_EXPIRED',
        message: 'Session expired or revoked. Please log in again.',
        requestId,
      },
    });
    return;
  }

  req.user = session.user;
  req.sessionToken = rawToken;
  next();
}

export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (!rawToken) {
    return next();
  }

  const tokenHash = hashToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (session && !session.revokedAt && session.expiresAt >= new Date()) {
    req.user = session.user;
    req.sessionToken = rawToken;
  } else if (session && (session.expiresAt < new Date() || session.revokedAt)) {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  }

  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const requestId = res.getHeader('x-request-id') as string;

  if (!req.user) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        requestId,
      },
    });
    return;
  }

  if (req.user.role !== Role.ADMIN && req.user.role !== Role.SUPER_ADMIN) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied: administrator privileges required',
        requestId,
      },
    });
    return;
  }

  next();
}

export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const requestId = res.getHeader('x-request-id') as string;

  if (!req.user) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        requestId,
      },
    });
    return;
  }

  if (req.user.role !== Role.SUPER_ADMIN) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied: Super Administrator privileges strictly required',
        requestId,
      },
    });
    return;
  }

  next();
}
