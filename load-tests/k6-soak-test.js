import http from 'k6/http';
import { check, sleep } from 'k6';

// ─────────────────────────────────────────────────────────────────
//  LOAD TEST: k6 Soak Test (Memory Leak & Endurance Testing)
//  File: load-tests/k6-soak-test.js
//
//  Maintains steady 30 concurrent Virtual Users over extended duration
//  to detect slow memory leaks, socket retention, and connection pool fatigue.
// ─────────────────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: '30s', target: 30 },  // Ramp up to 30 VUs
    { duration: '5m', target: 30 },   // Sustained 30 VUs (configurable)
    { duration: '30s', target: 0 },   // Graceful cooldown
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    http_req_failed: ['rate<0.01'], // Under 1% error rate
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:4000';

export default function () {
  const rand = Math.random();

  if (rand < 0.5) {
    const res = http.get(`${BASE_URL}/api/products`);
    check(res, { 'catalog status 200': (r) => r.status === 200 });
  } else if (rand < 0.8) {
    const res = http.get(`${BASE_URL}/api/products?category=Fashion`);
    check(res, { 'fashion category 200': (r) => r.status === 200 });
  } else {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, { 'health check 200': (r) => r.status === 200 });
  }

  sleep(1);
}
