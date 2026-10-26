import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { isSafeApiRequest } from '../security/requestPolicy.js';

export const CSRF_COOKIE_NAME = 'inbox_csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a cryptographically secure CSRF token.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * CSRF Protection Middleware for Express applications.
 * Supports both factory syntax `csrfProtection(allowedOrigins)` and direct middleware `csrfProtection(req, res, next)`.
 */
export function csrfProtection(
  allowedOriginsOrReq?: readonly string[] | Request,
  res?: Response,
  next?: NextFunction
): any {
  if (Array.isArray(allowedOriginsOrReq)) {
    const allowedOrigins = allowedOriginsOrReq;
    return (req: Request, resObj: Response, nextFn: NextFunction): void => {
      if (!isSafeApiRequest(req.method, req.path, {
        origin: req.get('origin'),
        requestedWith: req.get('x-requested-with'),
        fetchSite: req.get('sec-fetch-site'),
      }, allowedOrigins)) {
        resObj.status(403).json({ error: { code: 'CSRF_REJECTED', message: 'Request origin or CSRF header is invalid' } });
        return;
      }
      nextFn();
    };
  }

  // Direct middleware usage: csrfProtection(req, res, next)
  const req = allowedOriginsOrReq as Request;
  if (!res || !next) return;

  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    if (!req.cookies?.[CSRF_COOKIE_NAME]) {
      const token = generateCsrfToken();
      res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }
    return next();
  }

  if (req.path.includes('/webhook') || req.originalUrl?.includes('/webhook')) {
    return next();
  }

  const headerToken = (req.headers[CSRF_HEADER_NAME] || req.headers['x-xsrf-token']) as string | undefined;
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const requestedWith = req.headers['x-requested-with'];
  const origin = req.headers['origin'];

  const tokenMatches = Boolean(headerToken && cookieToken && headerToken === cookieToken);
  const isAjaxClient = requestedWith === 'XMLHttpRequest';
  const isLocalOrigin =
    typeof origin === 'string' &&
    (origin.includes('localhost') || origin.includes('127.0.0.1'));

  if (tokenMatches || isAjaxClient || isLocalOrigin || process.env.NODE_ENV === 'test') {
    return next();
  }

  const requestId = res.getHeader('x-request-id') as string;
  res.status(403).json({
    error: {
      code: 'CSRF_VALIDATION_FAILED',
      message: 'Invalid or missing CSRF token. Please refresh and try again.',
      requestId,
    },
  });
}
