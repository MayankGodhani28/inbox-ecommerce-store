// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';

const mocks = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  sellerApplication: { findFirst: vi.fn(), create: vi.fn() },
  cartItem: { findMany: vi.fn() },
  product: { findMany: vi.fn() },
  createSession: vi.fn(),
}));
vi.mock('../../../server/db/prisma.js', () => ({ prisma: mocks }));
vi.mock('../../../server/middleware/auth.js', () => ({
  SESSION_COOKIE_NAME: 'session',
  createSession: mocks.createSession,
  revokeSession: vi.fn(),
  optionalAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAuth: (req: any, res: any, next: () => void) => {
    if (!req.get('x-test-user')) return res.status(401).json({ error: { code: 'AUTH_REQUIRED' } });
    req.user = { id: 'owner', email: 'owner@example.test', role: 'CUSTOMER' };
    next();
  },
  requireAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireSuperAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
import { createApp } from '../../../server/app.js';

describe('CodeAnt API security regressions', () => {
  const app = createApp();
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.sellerApplication.findFirst.mockResolvedValue(null);
    mocks.product.findMany.mockResolvedValue([]);
  });
  it('blocks cross-origin and missing-header login requests before database access', async () => {
    await request(app).post('/api/auth/login').send({}).expect(403);
    await request(app).post('/api/auth/login').set('X-Requested-With', 'XMLHttpRequest')
      .set('Origin', 'https://evil.example').send({}).expect(403);
    expect(mocks.user.findUnique).not.toHaveBeenCalled();
  });
  it('requires authentication for private seller status even when an email is provided', async () => {
    await request(app).get('/api/super-admin/my-application?email=victim@example.test').expect(401);
    expect(mocks.sellerApplication.findFirst).not.toHaveBeenCalled();
  });
  it('does not reset another account password during seller onboarding', async () => {
    mocks.user.findUnique.mockResolvedValue({
      id: 'victim', email: 'victim@example.test', passwordHash: await bcrypt.hash('Original-password', 4),
    });
    await request(app).post('/api/super-admin/seller-apply')
      .set('X-Requested-With', 'XMLHttpRequest').send({
        storeName: 'Shop', email: 'victim@example.test', phone: '123', businessAddress: 'Address',
        password: 'Attacker-password',
      }).expect(403);
    expect(mocks.user.update).not.toHaveBeenCalled();
    expect(mocks.sellerApplication.create).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
  it('rejects negative merge quantities before performing database writes', async () => {
    await request(app).post('/api/cart/merge')
      .set('X-Requested-With', 'XMLHttpRequest').set('x-test-user', 'owner')
      .send({ items: [{ productId: 'p', quantity: -4 }] }).expect(400);
    expect(mocks.product.findMany).not.toHaveBeenCalled();
  });
  it('forwards async quantity validation failures to the HTTP error handler', async () => {
    await request(app).post('/api/checkout/quote')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ items: [{ productId: 'p', quantity: 1.5 }] }).expect(400);
  });
});
