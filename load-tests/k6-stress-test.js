import http from 'k6/http';
import { check, sleep } from 'k6';

// ─────────────────────────────────────────────────────────────────
//  LOAD TEST: k6 Stress Test (Finding System Capacity & Breaking Point)
//  File: load-tests/k6-stress-test.js
//
//  Ramps from 10 up to 200 concurrent Virtual Users across 5 stages
//  to identify response degradation and capacity limits.
// ─────────────────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: '15s', target: 20 },  // Phase 1: Low (20 VUs)
    { duration: '20s', target: 60 },  // Phase 2: Medium (60 VUs)
    { duration: '20s', target: 120 }, // Phase 3: High (120 VUs)
    { duration: '20s', target: 200 }, // Phase 4: Extreme Stress (200 VUs)
    { duration: '15s', target: 0 },   // Phase 5: Recovery Cooldown
  ],
  thresholds: {
    http_req_duration: ['p(95)<2500', 'p(99)<3500'],
    http_req_failed: ['rate<0.05'], // Max 5% errors allowed
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:4000';

export default function () {
  const rand = Math.random();

  if (rand < 0.6) {
    // 60%: Catalog browsing
    const res = http.get(`${BASE_URL}/api/products`);
    check(res, { 'catalog status 200': (r) => r.status === 200 });
  } else if (rand < 0.85) {
    // 25%: Category filter + Sort
    const res = http.get(`${BASE_URL}/api/products?category=Electronics&sort=rating`);
    check(res, { 'category search status 200': (r) => r.status === 200 });
  } else {
    // 15%: Trending & Deals
    const res = http.get(`${BASE_URL}/api/products?trending=true`);
    check(res, { 'trending status 200': (r) => r.status === 200 });
  }

  sleep(0.5);
}
