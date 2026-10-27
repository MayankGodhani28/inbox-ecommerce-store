import http from 'k6/http';
import { check, sleep } from 'k6';

// ─────────────────────────────────────────────────────────────────
//  LOAD TEST 1: k6 Normal Load (Daily Traffic Simulation)
//  File: load-tests/k6-normal-load.js
// ─────────────────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: '10s', target: 20 }, // Warm up
    { duration: '20s', target: 50 }, // Steady peak daily load
    { duration: '10s', target: 0 },  // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2500'],
    http_req_failed: ['rate<0.01'], // < 1% error rate
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:4000';

export default function () {
  const rand = Math.random();

  if (rand < 0.6) {
    // Browsing products & catalog
    const res = http.get(`${BASE_URL}/api/products`);
    check(res, { 'catalog status 200': (r) => r.status === 200 });
  } else if (rand < 0.85) {
    // Category & deals
    const res = http.get(`${BASE_URL}/api/products?dealOfDay=true`);
    check(res, { 'deals status 200': (r) => r.status === 200 });
  } else {
    // API health check
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, { 'health status 200': (r) => r.status === 200 });
  }

  sleep(1);
}
