import http from 'k6/http';
import { check, sleep } from 'k6';

// ─────────────────────────────────────────────────────────────────
//  LOAD TEST: k6 Endpoints Benchmark
//  File: load-tests/k6-endpoints.js
//
//  Benchmarks each core API endpoint individually to identify
//  latency bottlenecks across database queries and middleware.
// ─────────────────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: '10s', target: 20 },
    { duration: '20s', target: 40 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:4000';

export default function () {
  // 1. Catalog Products (default pagination)
  const pRes = http.get(`${BASE_URL}/api/products`, { tags: { name: 'GET_products' } });
  check(pRes, { 'products status 200': (r) => r.status === 200 });

  // 2. Filtered & Sorted Search
  const fRes = http.get(`${BASE_URL}/api/products?category=Electronics&sort=rating&pageSize=20`, {
    tags: { name: 'GET_products_filtered' },
  });
  check(fRes, { 'filtered products 200': (r) => r.status === 200 });

  // 3. Coupons Endpoint
  const cRes = http.get(`${BASE_URL}/api/coupons`, { tags: { name: 'GET_coupons' } });
  check(cRes, { 'coupons status 200': (r) => r.status === 200 });

  // 4. API Health Probe
  const hRes = http.get(`${BASE_URL}/api/health`, { tags: { name: 'GET_health' } });
  check(hRes, { 'health check 200': (r) => r.status === 200 });

  sleep(0.5);
}
