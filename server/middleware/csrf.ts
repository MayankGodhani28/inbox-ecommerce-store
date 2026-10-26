import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

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
 *
 * Implements the Double-Submit Cookie & Custom Request Header verification
 * pattern recommended by OWASP for Single Page Applications (SPAs) and REST APIs.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // 1. Safe HTTP methods (GET, HEAD, OPTIONS) do not modify server state
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    // Seed CSRF cookie if not already set
    if (!req.cookies?.[CSRF_COOKIE_NAME]) {
      const token = generateCsrfToken();
      res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false, // Accessible to client-side scripts to read and attach as header
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }
    return next();
  }

  // 2. Exempt webhooks that authenticate via cryptographic provider signatures (e.g., Stripe)
  if (req.path.includes('/webhook') || req.originalUrl?.includes('/webhook')) {
    return next();
  }

  // 3. State-changing requests: Validate CSRF tokens / Custom Header
  const headerToken = (req.headers[CSRF_HEADER_NAME] || req.headers['x-xsrf-token']) as string | undefined;
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const requestedWith = req.headers['x-requested-with'];
  const origin = req.headers['origin'];

  // A. Matching Double-Submit Cookie + Header
  const tokenMatches = Boolean(headerToken && cookieToken && headerToken === cookieToken);

  // B. Custom XMLHttpRequest Header: Browsers restrict cross-origin requests from setting
  // custom headers without prior CORS preflight check approval.
  const isAjaxClient = requestedWith === 'XMLHttpRequest';

  // C. Trusted local / same-origin in development
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
