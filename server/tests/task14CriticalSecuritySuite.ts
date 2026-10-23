import { prisma } from '../db/prisma';

const API_BASE = 'http://localhost:4000/api';

interface ApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

async function request(path: string, options: RequestInit = {}): Promise<{ status: number; body: ApiResponse; headers: Headers }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const body = (await res.json().catch(() => ({}))) as ApiResponse;
  return { status: res.status, body, headers: res.headers };
}

function extractCookie(headers: Headers): string {
  const setCookie = headers.get('set-cookie');
  if (!setCookie) return '';
  const match = setCookie.match(/inbox_session_id=([^;]+)/);
  return match ? `inbox_session_id=${match[1]}` : '';
}

async function runTask14CriticalSecuritySuite() {
  console.log('===============================================================');
  console.log(' [Task 14] Running Critical Security, Integrity & Review Suite ');
  console.log('===============================================================\n');

  const runId = Date.now();

  // 1. Request ID and Security Headers Check
  const healthRes = await request('/health');
  const reqId = healthRes.headers.get('x-request-id');
  if (!reqId) {
    throw new Error('Security check failed: x-request-id header missing from response');
  }
  console.log(`✓ Observability: x-request-id present on responses (${reqId}).`);

  // 2. Body Size Limit (> 1MB) Rejection
  const giantPayload = { data: 'A'.repeat(1024 * 1024 + 50) };
  const giantRes = await fetch(`${API_BASE}/checkout/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(giantPayload),
  });
  if (giantRes.status !== 413) {
    throw new Error(`Expected 413 Payload Too Large for >1MB body, got ${giantRes.status}`);
  }
  console.log('✓ Body Limits: Oversized request (>1MB) safely rejected with 413 Payload Too Large.');

  // 3. SQL Injection Resilience (Parameterized Prisma Queries)
  const sqlInjections = [
    "' OR '1'='1",
    "'; DROP TABLE \"User\"; --",
    "' UNION SELECT * FROM \"User\" --",
  ];

  for (const injection of sqlInjections) {
    const searchRes = await request(`/products?search=${encodeURIComponent(injection)}`);
    if (searchRes.status !== 200) {
      throw new Error(`SQL injection input resulted in error ${searchRes.status}: ${injection}`);
    }
  }
  // Verify User table still intact
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    throw new Error('Database integrity violated after SQL injection tests!');
  }
  console.log('✓ SQL Injection: Parameterized Prisma queries safely isolated all injection payloads.');

  // 4. Role Elevation and Registration Tampering Rejection
  const attackerEmail = `attacker_${runId}@evil.com`;
  const regAttackRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Malicious Actor',
      email: attackerEmail,
      password: 'HackerPassword2026!',
      role: 'ADMIN', // Tampering attempt
      isAdmin: true,
    }),
  });

  if (regAttackRes.status !== 201) {
    throw new Error(`Failed to register test attacker: ${regAttackRes.status}`);
  }
  const attackerUser = await prisma.user.findUnique({ where: { email: attackerEmail } });
  if (attackerUser?.role === 'ADMIN') {
    throw new Error('SECURITY VULNERABILITY: User was able to elevate role to ADMIN via registration payload!');
  }
  console.log('✓ Privilege Isolation: Role tampering on registration ignored; role set to CUSTOMER.');

  const attackerCookie = extractCookie(regAttackRes.headers);

  // Profile update role tampering
  const patchProfileRes = await request('/me', {
    method: 'PATCH',
    headers: { Cookie: attackerCookie },
    body: JSON.stringify({ role: 'ADMIN', isAdmin: true, email: 'admin@inbox.com' }),
  });
  const refreshedUser = await prisma.user.findUnique({ where: { email: attackerEmail } });
  if (refreshedUser?.role === 'ADMIN' || refreshedUser?.email !== attackerEmail) {
    throw new Error('SECURITY VULNERABILITY: Profile update allowed mutating role or email!');
  }
  console.log('✓ Privilege Isolation: Role and email tampering on profile update strictly rejected.');

  // Attacker forbidden from admin endpoints
  const adminAccessRes = await request('/admin/metrics', {
    headers: { Cookie: attackerCookie },
  });
  if (adminAccessRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for non-admin on /admin/metrics, got ${adminAccessRes.status}`);
  }
  console.log('✓ Authorization: Customer role denied from admin operations with 403 Forbidden.');

  // 5. Concurrency Test: Last stock unit race condition
  // Create a product with exactly 1 unit of stock
  const limitedProduct = await prisma.product.create({
    data: {
      id: `task14-limited-${runId}`,
      name: `Limited Edition Prototype ${runId}`,
      brand: 'VaultTech',
      category: 'Electronics',
      description: 'Exactly one unit available.',
      price: 5000,
      originalPrice: 5000,
      stock: 1,
      specifications: {},
      images: ['https://images.unsplash.com/photo-1546435770-a3e426bf472b'],
    },
  });

  // Register Customer 1 and Customer 2
  const c1Email = `shopper1_${runId}@test.com`;
  const c2Email = `shopper2_${runId}@test.com`;

  const c1Reg = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Shopper One', email: c1Email, password: 'SecurePassword2026!' }),
  });
  const c1Cookie = extractCookie(c1Reg.headers);

  const c2Reg = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Shopper Two', email: c2Email, password: 'SecurePassword2026!' }),
  });
  const c2Cookie = extractCookie(c2Reg.headers);

  const baseOrderPayload = {
    items: [{ productId: limitedProduct.id, quantity: 1 }],
    deliveryMethod: 'Standard',
    paymentMethod: 'Cash on Delivery',
    shippingAddress: { street: '42 Main St', city: 'Metropolis', state: 'NY', postalCode: '10001', country: 'US', phone: '+1 555-0101' },
    expectedTotalMinor: 5899,
  };

  // Launch two simultaneous purchase requests for the last remaining unit
  const [attempt1, attempt2] = await Promise.all([
    request('/orders', {
      method: 'POST',
      headers: { Cookie: c1Cookie, 'idempotency-key': `idem-race1-${runId}` },
      body: JSON.stringify(baseOrderPayload),
    }),
    request('/orders', {
      method: 'POST',
      headers: { Cookie: c2Cookie, 'idempotency-key': `idem-race2-${runId}` },
      body: JSON.stringify(baseOrderPayload),
    }),
  ]);

  const successCount = (attempt1.status === 201 ? 1 : 0) + (attempt2.status === 201 ? 1 : 0);
  const conflictCount = (attempt1.status === 400 ? 1 : 0) + (attempt2.status === 400 ? 1 : 0);

  if (successCount !== 1 || conflictCount !== 1) {
    throw new Error(`Concurrency race condition failed! Successes: ${successCount}, Conflicts: ${conflictCount}`);
  }

  // Check product stock in database: must be exactly 0, never negative!
  const finalProduct = await prisma.product.findUnique({ where: { id: limitedProduct.id } });
  if (finalProduct?.stock !== 0) {
    throw new Error(`Expected final stock 0, got ${finalProduct?.stock}`);
  }
  console.log('✓ Concurrency: Simultaneous purchases of last stock unit resolved atomically (1 success, 1 failure, stock = 0).');

  // 6. Idempotency replay and mutation tampering
  const winningCookie = attempt1.status === 201 ? c1Cookie : c2Cookie;
  const winningKey = attempt1.status === 201 ? `idem-race1-${runId}` : `idem-race2-${runId}`;

  // Replay exact same request
  const replayRes = await request('/orders', {
    method: 'POST',
    headers: { Cookie: winningCookie, 'idempotency-key': winningKey },
    body: JSON.stringify(baseOrderPayload),
  });
  if (replayRes.status !== 200 && replayRes.status !== 201) {
    throw new Error(`Expected idempotent replay to succeed, got ${replayRes.status}`);
  }

  // Count orders in DB for this product: must be exactly 1
  const ordersCount = await prisma.orderItem.count({ where: { productId: limitedProduct.id } });
  if (ordersCount !== 1) {
    throw new Error(`Duplicate order created on replay! Expected 1, found ${ordersCount}`);
  }
  console.log('✓ Idempotency: Replaying order submission returns original order without duplicate creations.');

  // Reusing same idempotency key with different payload must fail with 400
  const tamperedKeyRes = await request('/orders', {
    method: 'POST',
    headers: { Cookie: winningCookie, 'idempotency-key': winningKey },
    body: JSON.stringify({ ...baseOrderPayload, deliveryMethod: 'Express' }),
  });
  if (tamperedKeyRes.status !== 400) {
    throw new Error(`Expected 400 for altered payload under existing idempotency key, got ${tamperedKeyRes.status}`);
  }
  console.log('✓ Idempotency: Reusing idempotency key with altered payload correctly rejected with 400.');

  // Clean up
  await prisma.orderItem.deleteMany({ where: { productId: limitedProduct.id } });
  await prisma.order.deleteMany({ where: { customerEmail: { in: [c1Email, c2Email, attackerEmail] } } });
  await prisma.product.delete({ where: { id: limitedProduct.id } });

  console.log('\n===============================================================');
  console.log(' ALL TASK 14 CRITICAL SECURITY & INTEGRITY CHECKS PASSED!     ');
  console.log('===============================================================\n');
}

runTask14CriticalSecuritySuite()
  .catch((err) => {
    console.error('\n❌ Task 14 Security Suite FAILED:\n', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
