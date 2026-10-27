import http from 'k6/http';
import { check, sleep } from 'k6';

// ─────────────────────────────────────────────────────────────────
//  LOAD TEST 3: k6 Spike Test (Flash Sale / Traffic Spike Simulation)
//  File: load-tests/k6-spike-test.js
//
//  Simulates: A sudden massive traffic spike on inBox E-Commerce Store
//  Pattern:
//   - Pre-sale warm-up: 20 Virtual Users (VUs)
//   - ⚡ THE SPIKE: 500 VUs rushing the store simultaneously
//   - Post-spike recovery: back down to 20 VUs
// ─────────────────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: '15s', target: 20 },  // 1. Pre-Sale (Quiet): 20 users
    { duration: '20s', target: 500 }, // 2. ⚡ SPIKE: 500 users rush in
    { duration: '15s', target: 20 },  // 3. Post-Spike Recovery
    { duration: '5s', target: 0 },    // 4. Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000', 'p(99)<4000'], // 95% under 3s, 99% under 4s during 500 VU spike
    http_req_failed: ['rate<0.05'],                    // Error rate under 5% during 500 VU surge
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:4000';

export default function () {
  const rand = Math.random();

  // Scenario 1 (70%): Flash Sale Rush — Browse + Deals + Best Sellers + Coupons
  if (rand < 0.70) {
    const dealsRes = http.get(`${BASE_URL}/api/products?dealOfDay=true`, {
      tags: { name: 'GetDealsOfDay' },
    });
    check(dealsRes, {
      'deals status is 200': (r) => r.status === 200,
    });

    const bestSellersRes = http.get(`${BASE_URL}/api/products?bestSeller=true&pageSize=20`, {
      tags: { name: 'GetBestSellers' },
    });
    check(bestSellersRes, {
      'best sellers status is 200': (r) => r.status === 200,
    });

    const couponsRes = http.get(`${BASE_URL}/api/coupons`, {
      tags: { name: 'GetCoupons' },
    });
    check(couponsRes, {
      'coupons status is 200': (r) => r.status === 200,
    });
  }
  // Scenario 2 (20%): Category Search & Sorting
  else if (rand < 0.90) {
    const categoryRes = http.get(`${BASE_URL}/api/products?category=Electronics&sort=price-asc`, {
      tags: { name: 'GetCategoryFiltered' },
    });
    check(categoryRes, {
      'category filtered status is 200': (r) => r.status === 200,
    });
  }
  // Scenario 3 (10%): Authentication / Login Check
  else {
    const payload = JSON.stringify({
      email: 'spike-test@inbox.com',
      password: 'spiketest123',
    });
    const params = {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'http://localhost:3000',
      },
      tags: { name: 'PostLogin' },
    };
    const loginRes = http.post(`${BASE_URL}/api/auth/login`, payload, params);
    check(loginRes, {
      'login handled (200, 400, 401, or 429 rate-limited)': (r) => [200, 400, 401, 429].includes(r.status),
    });
  }

  sleep(0.5); // Short think time between user actions
}
