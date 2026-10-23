import { Router, Request, Response } from 'express';
import { checkDbConnection } from '../../db/prisma.js';

export const healthRouter = Router();

// GET /api/health - Process health
healthRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    data: {
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

// GET /api/health/db - Database readiness (SELECT 1)
healthRouter.get('/health/db', async (_req: Request, res: Response) => {
  const result = await checkDbConnection();
  if (!result.ok) {
    res.status(503).json({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database unavailable',
      },
    });
    return;
  }

  res.status(200).json({
    data: {
      status: 'ok',
      database: 'connected',
      latencyMs: result.latencyMs,
      timestamp: new Date().toISOString(),
    },
  });
});
