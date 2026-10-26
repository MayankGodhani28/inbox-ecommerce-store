import type { Request, Response, NextFunction } from 'express';
import { isSafeApiRequest } from '../security/requestPolicy.js';

export function csrfProtection(allowedOrigins: readonly string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isSafeApiRequest(req.method, req.path, {
      origin: req.get('origin'),
      requestedWith: req.get('x-requested-with'),
      fetchSite: req.get('sec-fetch-site'),
    }, allowedOrigins)) {
      res.status(403).json({ error: { code: 'CSRF_REJECTED', message: 'Request origin or CSRF header is invalid' } });
      return;
    }
    next();
  };
}
