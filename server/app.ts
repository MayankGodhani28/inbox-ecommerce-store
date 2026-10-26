import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { getEnv } from './config/env.js';
import { healthRouter } from './modules/health/healthRoutes.js';
import { authRouter } from './modules/auth/authRoutes.js';
import { userRouter } from './modules/users/userRoutes.js';
import { catalogRouter } from './modules/catalog/catalogRoutes.js';
import { adminRouter } from './modules/admin/adminRoutes.js';
import { cartRouter } from './modules/cart/cartRoutes.js';
import { savedRouter } from './modules/saved/savedRoutes.js';
import { wishlistRouter } from './modules/wishlist/wishlistRoutes.js';
import { checkoutRouter } from './modules/checkout/checkoutRoutes.js';
import { orderRouter } from './modules/orders/orderRoutes.js';
import { newsletterRouter } from './modules/newsletter/newsletterRoutes.js';
import { paymentRouter } from './modules/payments/paymentRoutes.js';
import { superAdminRouter } from './modules/superadmin/superAdminRoutes.js';
import { csrfProtection } from './middleware/csrf.js';

export function createApp() {
  const env = getEnv();
  const app = express();

  // Request ID middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
    res.setHeader('x-request-id', requestId);
    req.headers['x-request-id'] = requestId;
    next();
  });

  // Structured redacted request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const reqId = res.getHeader('x-request-id') as string;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const sanitizedUrl = req.originalUrl.replace(/([?&](?:password|token|secret|key)=)[^&]+/gi, '$1***');
      // Structured JSON log with redacted query params
      if (!req.path.startsWith('/health')) {
        console.log(
          JSON.stringify({
            level: res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO',
            timestamp: new Date().toISOString(),
            requestId: reqId,
            method: req.method,
            url: sanitizedUrl,
            status: res.statusCode,
            durationMs: duration,
          })
        );
      }
    });

    next();
  });

  // CORS configuration
  app.use(
    cors({
      origin: [env.CLIENT_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-request-id', 'idempotency-key', 'x-csrf-token', 'x-xsrf-token'],
    })
  );

  // Cookie parser
  app.use(cookieParser());

  // Body parser with bounded payload size and rawBody preservation for webhooks
  app.use(
    express.json({
      limit: '1mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // CSRF protection middleware on state-changing requests
  app.use(csrfProtection);

  // Routes
  app.use('/api', healthRouter);
  app.use('/api', checkoutRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/me', userRouter);
  app.use('/api/products', catalogRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/cart', cartRouter);
  app.use('/api/saved-items', savedRouter);
  app.use('/api/wishlist', wishlistRouter);
  app.use('/api/checkout', checkoutRouter);
  app.use('/api/orders', orderRouter);
  app.use('/api/newsletter', newsletterRouter);
  app.use('/api/payments', paymentRouter);
  app.use('/api/super-admin', superAdminRouter);

  // 404 fallback for API routes
  app.all('/api/*', (req: Request, res: Response) => {
    const requestId = res.getHeader('x-request-id');
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        requestId,
      },
    });
  });

  // Serve static assets in production if dist/ directory exists
  const distPath = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global sanitized error handler
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const requestId = res.getHeader('x-request-id');
    const statusCode = typeof err?.status === 'number' ? err.status : typeof err?.statusCode === 'number' ? err.statusCode : 500;
    const errorCode = err?.type === 'entity.too.large' ? 'PAYLOAD_TOO_LARGE' : statusCode === 400 ? 'INVALID_INPUT' : 'INTERNAL_SERVER_ERROR';
    const message = err instanceof Error ? err.message : 'Internal server error';

    // Sanitize any secrets/stack trace
    const safeMessage =
      statusCode === 500 && process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : message.replace(/(postgresql:\/\/)[^@]+@/gi, '$1***:***@');

    if (statusCode === 500) {
      console.error(`[Error] Request ${requestId} failed:`, safeMessage);
    }

    res.status(statusCode).json({
      error: {
        code: errorCode,
        message: safeMessage,
        requestId,
      },
    });
  });

  return app;
}
