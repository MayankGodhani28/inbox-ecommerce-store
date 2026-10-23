# 🛒 Inbox E-Commerce Platform — Technical Architecture & Master Documentation

> **Version:** 2.0.0 (Production Release)  
> **Application Type:** Full-Stack E-Commerce Application  
> **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Motion  
> **Backend:** Node.js, Express, TypeScript, Prisma ORM  
> **Database:** PostgreSQL (v16+) with ACID Transactions  
> **Authentication:** Opaque Session Tokens, HttpOnly Secure Cookies, bcrypt Password Hashing  
> **Payment Gateways:** Official Stripe Hosted Checkout & Webhooks, Audited Cash on Delivery (COD)  

---

## 1. System Architecture & Component Design

The platform uses a modular, decoupled architecture where presentation, business logic, data access, and persistence are cleanly isolated.

```
┌─────────────────────────────────────────────────────────────┐
│                       React 19 Frontend                     │
│  - React Router / SPA URL History (pushState / popstate)    │
│  - Context Providers: AuthContext, CartContext, WishlistCtx │
│  - API Client: Credentials-included, x-request-id tracing  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON / Cookies
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express.js REST API                      │
│  - Request ID & Structured Redacted Logging Middleware      │
│  - CORS & Rate Limiting Guard                               │
│  - Session Authentication Middleware (Database-backed)      │
│  - Body Parser (1MB limit, rawBody preserved for Stripe)    │
│  - Domain Modules:                                          │
│    * /api/auth       * /api/me          * /api/products     │
│    * /api/cart       * /api/wishlist    * /api/checkout     │
│    * /api/orders     * /api/payments    * /api/admin        │
│    * /api/newsletter * /api/health                          │
└──────────────────────────────┬──────────────────────────────┘
                               │ Prisma ORM (Connection Pool)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     PostgreSQL Database                     │
│  - Normalized Tables: User, Session, Address, Product,      │
│    CartItem, SavedItem, WishlistItem, Coupon, Order,        │
│    OrderItem, OrderStatusHistory, CheckoutRequest, Review   │
│  - Row-Level Locking, Atomic Updates & ACID Transactions    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema & Data Models

### 2.1 Core Entities & Constraints

1. **User**: Unique normalized email, bcrypt password hash (salt rounds = 10), role (`CUSTOMER` or `ADMIN`), creation timestamps.
2. **Session**: Opaque cryptographically generated 256-bit token. Only SHA-256 hash is persisted in PostgreSQL with expiry index and cascade deletion upon user revocation.
3. **Address**: Multi-address book per user, transactional default address toggle (exactly one default per customer).
4. **Product**: Catalog items with integer minor-unit pricing (`price`, `originalPrice`), category, tags, colors, sizes, specifications, and `stock >= 0`. Derived ratings updated transactionally upon review submission.
5. **CartItem / SavedItem / WishlistItem**: Database-backed cart persistence with owner foreign keys and unique constraints preventing duplicate option permutations.
6. **Coupon & CouponRedemption**: Unique coupon codes with percentage or fixed discount, minimum spend thresholds, discount caps, free shipping toggles, expiry dates, and usage limits enforced transactionally.
7. **Order & OrderItem**: Immutable purchase records capturing customer snapshots, addresses, line items, monetary breakdown in integer minor units, payment status (`Pending` or `Paid`), and fulfillment status (`Order Placed`, `Confirmed`, `Packed`, `Shipped`, `Out for Delivery`, `Delivered`).
8. **OrderStatusHistory**: Audit log of status transitions recording previous status, new status, timestamp, actor, and tracking notes.
9. **CheckoutRequest**: Idempotency ledger mapping user ID and `idempotency-key` to SHA-256 payload hashes, preventing duplicate orders or double charges.
10. **Review**: Authenticated customer reviews (rating 1–5, comment) with server-derived `verifiedPurchase` boolean based on actual delivered/paid orders.
11. **NewsletterSubscription**: RFC-validated unique email subscriptions with consent timestamps.

---

## 3. Security & Data Integrity Guarantees

- **Privilege Isolation:** Public registration and profile mutation endpoints explicitly sanitize and reject `role` or privilege escalation attempts. Admin routes are guarded by strict role-checking middleware returning 403 Forbidden.
- **SQL Injection Immunity:** All database access is parameterized through Prisma ORM; raw user input never concatenates into SQL commands.
- **Atomic Inventory Decrements:** Inventory reservations and orders use atomic conditional updates (`stock: { gte: quantity }`), row-locking in PostgreSQL to guarantee zero overselling or negative stock under race conditions.
- **Safe Monetary Calculations:** All pricing calculations (subtotals, discounts, delivery fees, and taxes) occur authoritatively on the server in integer cents/minor units. Client-side price modifications are rejected.
- **Payment Security:** No sensitive card numbers, expiration dates, or CVVs ever touch our servers. Online payments use Stripe hosted checkout sessions, and webhooks verify HMAC signatures against raw request buffers.
- **Oversized Payload Rejection:** Express enforces a strict 1MB body limit on incoming requests, returning 413 Payload Too Large.

---

## 4. API Endpoints Reference

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | Public | Process health and uptime |
| `GET` | `/api/health/db` | Public | Database connection latency and readiness |
| `POST` | `/api/auth/register` | Public | Customer account registration |
| `POST` | `/api/auth/login` | Public | Authenticate user and issue HttpOnly session cookie |
| `POST` | `/api/auth/logout` | Authenticated | Revoke session and clear cookies |
| `GET` | `/api/auth/me` | Authenticated | Fetch current authenticated user session |
| `GET` | `/api/products` | Public | Paginated catalog search, filtering, and sorting |
| `GET` | `/api/products/:id` | Public | Product details with reviews |
| `POST` | `/api/products/:id/reviews` | Authenticated | Submit verified product review (1–5 stars) |
| `GET` | `/api/cart` | Authenticated | Retrieve persistent user cart items |
| `POST` | `/api/cart` | Authenticated | Add item to cart with quantity validation |
| `POST` | `/api/checkout/quote` | Public / Auth | Authoritative server price, tax, and coupon quotation |
| `POST` | `/api/orders` | Authenticated | Create atomic order with idempotency protection |
| `GET` | `/api/orders` | Authenticated | Retrieve customer's order history |
| `GET` | `/api/orders/:id` | Authenticated | Retrieve detailed order invoice by ID |
| `GET` | `/api/admin/metrics` | Admin | Aggregate sales revenue (excluding unpaid COD) and counts |
| `GET` | `/api/admin/orders` | Admin | Fulfillment order queue |
| `PATCH` | `/api/orders/:id/status` | Admin | Forward status progression with tracking updates |
| `PATCH` | `/api/orders/:id/collect-payment` | Admin | Audit and collect COD payment |
| `POST` | `/api/payments/create-checkout-session` | Authenticated | Initialize Stripe hosted payment session |
| `POST` | `/api/payments/webhook` | Public (Stripe) | Verified webhook for asynchronous payment events |

---

## 5. Deployment & Operational Runbook

### 5.1 Deployment with Docker Compose

To deploy the production-ready stack (Application + PostgreSQL):
```bash
docker compose up -d --build
```

### 5.2 Database Migrations in Production

When deploying code updates with database schema modifications:
```bash
npx prisma migrate deploy
```

### 5.3 Database Backup & Disaster Recovery

Run the automated backup utility to create a verified database snapshot:
```bash
npm run db:backup
```
Snapshots are stored in `server/backups/`.

To perform a native PostgreSQL restore:
```bash
pg_restore -U postgres -d inbox_store -v <backup-file>.dump
```

### 5.4 Rollback Procedure

1. If an application update fails health checks, revert the application container to the previous image tag.
2. In case of database migration rollback, apply the corresponding down-migration script or restore the pre-migration snapshot using `pg_restore`.
