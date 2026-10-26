import { csrfFetch } from '../tests/httpClient.js';
import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:4000';

interface BenchResult {
  endpoint: string;
  method: string;
  status: number;
  timeMs: number;
  category: string;
}

async function run() {
  console.log('🚀 Starting API Benchmarking against', BASE_URL);

  // 1. Authenticate to get session cookie
  let sessionCookie = '';
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'AdminSecure2026!';
  try {
    const authRes = await csrfFetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: process.env.BENCHMARK_EMAIL || 'admin@inbox.com', password: process.env.BENCHMARK_PASSWORD || adminPassword }),
    });
    const setCookie = authRes.headers.get('set-cookie');
    if (setCookie) {
      sessionCookie = setCookie.split(';')[0];
    }
    console.log('✓ Authenticated as admin session.');
  } catch (err) {
    console.warn('Could not authenticate as admin:', err);
  }

  // 2. Fetch a sample product ID
  let sampleProductId = '';
  try {
    const prodRes = await csrfFetch(`${BASE_URL}/api/products?limit=1`);
    const prodData = (await prodRes.json()) as any;
    sampleProductId = prodData?.data?.products?.[0]?.id || '';
  } catch { /* fallback to empty */ }

  const benchmarks: Array<{
    category: string;
    method: string;
    path: string;
    body?: any;
    auth?: boolean;
  }> = [
    // Health & System
    { category: 'Health & System', method: 'GET', path: '/api/health' },
    { category: 'Health & System', method: 'GET', path: '/api/health/db' },

    // Auth
    { category: 'Authentication', method: 'GET', path: '/api/auth/me', auth: true },
    {
      category: 'Authentication',
      method: 'POST',
      path: '/api/auth/login',
      body: { email: process.env.BENCHMARK_EMAIL || 'admin@inbox.com', password: process.env.BENCHMARK_PASSWORD || adminPassword },
    },

    // User Profile & Addresses
    { category: 'User & Profile', method: 'GET', path: '/api/me', auth: true },
    { category: 'User & Profile', method: 'GET', path: '/api/me/addresses', auth: true },

    // Catalog & Reviews
    { category: 'Catalog', method: 'GET', path: '/api/products' },
    { category: 'Catalog', method: 'GET', path: '/api/products?category=Electronics' },
    { category: 'Catalog', method: 'GET', path: '/api/products?search=pro' },
    { category: 'Catalog', method: 'GET', path: sampleProductId ? `/api/products/${sampleProductId}` : '/api/products' },
    { category: 'Catalog', method: 'GET', path: sampleProductId ? `/api/products/${sampleProductId}/reviews` : '/api/products' },

    // Cart
    { category: 'Cart', method: 'GET', path: '/api/cart', auth: true },

    // Saved Items
    { category: 'Saved Items', method: 'GET', path: '/api/saved-items', auth: true },

    // Wishlist
    { category: 'Wishlist', method: 'GET', path: '/api/wishlist', auth: true },

    // Checkout & Coupons
    { category: 'Checkout & Coupons', method: 'GET', path: '/api/coupons' },
    {
      category: 'Checkout & Coupons',
      method: 'POST',
      path: '/api/checkout/quote',
      body: { items: sampleProductId ? [{ productId: sampleProductId, quantity: 1 }] : [], deliveryMethod: 'Standard' },
    },
    {
      category: 'Checkout & Coupons',
      method: 'POST',
      path: '/api/coupons/validate',
      body: { code: 'WELCOME10', items: sampleProductId ? [{ productId: sampleProductId, quantity: 1 }] : [] },
    },

    // Orders
    { category: 'Orders', method: 'GET', path: '/api/orders', auth: true },

    // Admin
    { category: 'Admin Portal', method: 'GET', path: '/api/admin/metrics', auth: true },
    { category: 'Admin Portal', method: 'GET', path: '/api/admin/orders', auth: true },
    { category: 'Admin Portal', method: 'GET', path: '/api/admin/customers', auth: true },
    { category: 'Admin Portal', method: 'GET', path: '/api/admin/products', auth: true },

    // Payments
    { category: 'Payments', method: 'GET', path: '/api/payments/config' },

    // Newsletter
    { category: 'Newsletter', method: 'GET', path: '/api/newsletter/status?email=admin@inbox.com' },
    { category: 'Newsletter', method: 'POST', path: '/api/newsletter/subscribe', body: { email: `bench-${Date.now()}@example.com` } },
  ];

  const results: BenchResult[] = [];

  for (const b of benchmarks) {
    const headers: Record<string, string> = {};
    if (b.body) headers['Content-Type'] = 'application/json';
    if (b.auth && sessionCookie) headers['Cookie'] = sessionCookie;

    // Warm-up call
    try {
      await csrfFetch(`${BASE_URL}${b.path}`, {
        method: b.method,
        headers,
        body: b.body ? JSON.stringify(b.body) : undefined,
      });
    } catch { /* Invalid or inaccessible persisted data falls back to empty state. */ }

    // Measured runs (3 iterations)
    const times: number[] = [];
    let lastStatus = 0;

    for (let i = 0; i < 3; i += 1) {
      const t0 = performance.now();
      try {
        const res = await csrfFetch(`${BASE_URL}${b.path}`, {
          method: b.method,
          headers,
          body: b.body ? JSON.stringify(b.body) : undefined,
        });
        const t1 = performance.now();
        lastStatus = res.status;
        times.push(t1 - t0);
      } catch (err: any) {
        lastStatus = 500;
        times.push(999);
      }
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    results.push({
      category: b.category,
      method: b.method,
      endpoint: b.path,
      status: lastStatus,
      timeMs: parseFloat(avgTime.toFixed(2)),
    });
  }

  console.log('\n--- BENCHMARK RESULTS (JSON) ---');
  console.log(JSON.stringify(results, null, 2));
}

run();
