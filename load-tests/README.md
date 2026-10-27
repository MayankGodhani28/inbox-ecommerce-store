# ⚡ Grafana k6 Load Testing — inBox E-Commerce

> High-concurrency performance and stress testing powered by **Grafana k6** (Go-based engine).

---

## 🚀 Before You Start

Make sure the backend server is running in a terminal:

```bash
npm run server:dev   # Terminal 1: Starts Express on http://localhost:4000
```

Then open a second terminal for load tests.

---

## 🧪 Available Load Tests & Commands

You can run any test using `npm run load:<name>` or `npm run k6:<name>`:

### 1️⃣ Normal Load Test (Daily Traffic Simulation)
Simulates a steady busy day (20 to 50 concurrent Virtual Users):
```bash
npm run load:normal
# or: npm run k6:normal
```

### 2️⃣ ⚡ Flash Sale Spike Test (Extreme 500 VUs Surge)
Simulates a rapid flash sale / Diwali sale surge ramping to **500 concurrent users** and testing brute-force protection, rate limiting, and recovery:
```bash
npm run load:spike
# or: npm run k6:spike
```

### 3️⃣ Stress Test (Find System Breaking Point)
Increases concurrent users through 5 stages (20 → 60 → 120 → 200 VUs) to discover server saturation limits:
```bash
npm run load:stress
# or: npm run k6:stress
```

### 4️⃣ Soak Test (Memory Leak & Endurance Detection)
Maintains sustained 30 concurrent Virtual Users over extended time to detect slow memory leaks and connection pool fatigue:
```bash
npm run load:soak
# or: npm run k6:soak
```

### 5️⃣ API Endpoints Benchmark
Benchmarks core routes (`/api/products`, `/api/coupons`, `/api/health`) individually:
```bash
npm run load:endpoints
# or: npm run k6:endpoints
```

### 🚀 Run All Tests in Sequence
```bash
npm run load:all
```

---

## 📊 Understanding k6 Metrics

When a test finishes, k6 prints exact statistics:

```text
  █ THRESHOLDS 

    http_req_duration
    ✓ 'p(95)<3000' p(95)=2.14s   ← 95% of users experienced <= 2.14s response time
    ✓ 'p(99)<4000' p(99)=2.18s   ← 99% of users experienced <= 2.18s response time

    http_req_failed
    ✓ 'rate<0.05' rate=4.05%     ← Error rate below 5% (only expected 429 rate-limiting)

  █ TOTAL RESULTS 

    checks_succeeded...: 100.00% 8533 out of 8533
    http_req_duration..: avg=986.74ms med=934.47ms p(90)=2.10s p(95)=2.14s
    http_reqs..........: 8533   154.25/s
    data_received......: 47 MB  840 kB/s
```

### ✅ Performance Thresholds
- **Average Latency:** `< 1,000 ms` under standard traffic, `< 1,500 ms` during 500-VU spikes.
- **p(95) Latency:** 95% of responses delivered in under 3.0 seconds during peak surge.
- **Error Rate:** `< 5%` during surge (handled rate-limiting status 429), `< 1%` during normal daily load.
- **Zero Server Crashes:** 100% database connection retention without process restarts.

---

## 📁 Test Scripts Directory

| Script | Purpose | Concurrency | Duration |
|---|---|---|---|
| `k6-normal-load.js` | Daily traffic baseline | 20–50 VUs | 40s |
| `k6-spike-test.js` | Flash sale rush | 20 → 500 VUs | 55s |
| `k6-stress-test.js` | Breaking point search | 20 → 200 VUs | 90s |
| `k6-soak-test.js` | Memory leak endurance | 30 VUs | 6 min |
| `k6-endpoints.js` | Route latency comparison | 20–40 VUs | 40s |
| `run-load-tests.ts` | Multi-suite runner CLI | Configurable | Dynamic |
