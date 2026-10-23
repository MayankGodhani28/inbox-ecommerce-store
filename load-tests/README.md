# 🏋️ Load Testing — inBox E-Commerce

> Powered by **Artillery** — simulates real users hitting your server

## Before You Start

**You MUST start your backend server first:**
```bash
npm run server:dev   # in Terminal 1
```
Then open a second terminal for load tests.

---

## Test Types & Commands

### 1️⃣ Normal Load Test (Start Here)
Simulates a normal busy day — 50 users/second for 1 minute.
```bash
npm run load:normal
```

### 2️⃣ Stress Test (Find Breaking Point)
Increases users from 10 → 200/second to find when server fails.
```bash
npm run load:stress
```

### 3️⃣ Spike Test (Flash Sale / Diwali Sale)
Normal → **500 users/second SPIKE** → back to normal.
```bash
npm run load:spike
```

### 4️⃣ Soak Test (Memory Leak Detection)
30 users/second for **10 minutes** — finds slow memory leaks.
```bash
npm run load:soak
```

### 5️⃣ API Endpoints Benchmark
Tests each endpoint individually to find which one is slowest.
```bash
npm run load:endpoints
```

### 🚀 Run All Tests
```bash
npm run load:all
```

---

## Reading the Results

```
http.request_rate ........................: 145/sec   ← requests per second
http.response_time.min ...................: 12ms
http.response_time.p50 ...................: 89ms      ← 50% of users wait this long
http.response_time.p95 ...................: 420ms     ← 95% of users wait this long ✅
http.response_time.p99 ...................: 1200ms    ← 99% of users wait this long
http.response_time.max ...................: 4320ms
http.codes.200 ...........................: 8720      ← successful responses
errors.rate ..............................: 0.2%      ← error rate (must be < 1%)
```

### ✅ Good Results
- `p95 < 1000ms` — 95% of users get a response in under 1 second
- `errors.rate < 1%` — less than 1% of requests fail

### ❌ Bad Results (Server is struggling)
- `p95 > 2000ms` — users waiting more than 2 seconds
- `errors.rate > 5%` — too many requests timing out / failing

---

## HTML Reports

Every test generates an HTML report in `load-tests/reports/`.
Open it in your browser for charts and graphs:

```
load-tests/
  reports/
    normal.html    ← open this in browser
    stress.html
    spike.html
    ...
```

---

## Test Files

| File | Test Type | Duration | Max Load |
|---|---|---|---|
| `01-normal-load.yml` | Normal | ~2 min | 50 req/s |
| `02-stress-test.yml` | Stress | ~3 min | 200 req/s |
| `03-spike-test.yml` | Spike | ~1.5 min | 500 req/s |
| `04-soak-test.yml` | Soak | 10 min | 30 req/s |
| `05-api-endpoints.yml` | Benchmark | 1 min | 30 req/s |
