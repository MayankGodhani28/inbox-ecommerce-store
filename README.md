# Inbox E-Commerce Platform

A production-ready e-commerce platform engineered with a React 19 + TypeScript + Vite frontend, an Express + TypeScript backend, and a PostgreSQL database managed via Prisma ORM.

---

## Architecture Overview

```
[ Browser / Client ] 
        │ (HTTPS / Cookies / x-request-id)
        ▼
[ Express API & Static Server (Port 4000) ]
        ├── Security: Helmet, CORS, Body limits (1MB), Rate Limiting
        ├── Auth: Session cookies (HttpOnly, SameSite, SHA-256 hash in DB)
        ├── Commerce: Catalog, Cart, Saved Items, Authoritative Quotation
        ├── Orders: Atomic inventory transactions, Idempotency keys
        ├── Payments: Hosted Stripe Checkout & Webhooks / Cash on Delivery
        └── Observability: Structured JSON logs, /api/health, /api/health/db
        │
        ▼
[ PostgreSQL Database (Port 5432) ]
        └── Tables: User, Session, Address, Product, CartItem, SavedItem,
                    WishlistItem, Coupon, CouponRedemption, Order, OrderItem,
                    OrderStatusHistory, CheckoutRequest, Review, Newsletter
```

---

## Prerequisites

- **Node.js**: v20+ (v22+ recommended)
- **PostgreSQL**: v16+ (locally or via Docker Compose)
- **Docker & Docker Compose**: (Optional, for containerized deployment)

---

## Getting Started

### 1. Environment Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your environment variables:
```env
PORT=4000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/inbox_store?schema=public
SESSION_SECRET=your-random-32-char-session-secret-here
# Optional Stripe online payments:
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
*Note: If your database password contains special characters like `@`, URL-encode them (e.g. `@` -> `%40`).*

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Migration and Seeding

Generate Prisma client, apply schema migrations, and seed initial catalog and test users:
```bash
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
```

To bootstrap or promote an administrator account:
```bash
npm run admin:bootstrap
```

### 4. Running the Development Environment

Run both frontend and backend concurrently in separate terminals:

**Terminal 1 — Backend (Port 4000):**
```bash
npm run server:dev
```

**Terminal 2 — Frontend (Port 3000):**
```bash
npm run dev
```

The frontend Vite server automatically proxies all `/api/*` calls to the backend on `http://localhost:4000`.

---

## Production Deployment

### Option A: Docker Compose (Single Command)

Build and deploy the application and PostgreSQL in a unified container stack:
```bash
docker compose up -d --build
```
- Frontend & Backend: `http://localhost:4000`
- PostgreSQL: `localhost:5432`

### Option B: Standalone Node.js Build

Build the production frontend bundle and backend bundle:
```bash
npm run build
npm run server:build
```
Apply database migrations in production:
```bash
npm run prisma:deploy
```
Start the production server (serves both API and static UI):
```bash
NODE_ENV=production npm run server:start
```

---

## Database Backup and Recovery

To export an authoritative snapshot of the PostgreSQL database:
```bash
npm run db:backup
```
Backups are saved to `server/backups/backup_inbox_store_<timestamp>.json`. The script automatically verifies integrity and table relationships.

For native PostgreSQL dump and restore:
```bash
# Dump
pg_dump -U postgres -d inbox_store -F c -b -v -f backup_inbox_store.dump

# Restore into clean recovery database
pg_restore -U postgres -d inbox_store_recovery -v backup_inbox_store.dump
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Launch Vite frontend development server (port 3000) |
| `npm run build` | Compile frontend production bundle to `dist/` |
| `npm run lint` | Run TypeScript type checks on frontend (`tsc --noEmit`) |
| `npm run server:dev` | Launch Express backend server with hot-reload via `tsx` |
| `npm run server:typecheck` | Run TypeScript type checks on backend code |
| `npm run server:build` | Bundle backend server using `esbuild` to `dist/server` |
| `npm run server:start` | Run compiled production backend server (`node dist/server/index.js`) |
| `npm run prisma:generate` | Regenerate Prisma Client types |
| `npm run prisma:migrate` | Apply Prisma schema migrations in development |
| `npm run prisma:deploy` | Apply pending Prisma migrations in production |
| `npm run prisma:studio` | Launch Prisma Studio GUI browser |
| `npm run db:seed` | Seed database with initial catalog, coupons, and test users |
| `npm run db:backup` | Execute database backup and recovery verification |
| `npm run admin:bootstrap` | Provision an administrator account |

---

## Health Checks & Monitoring

- **Process Health**: `GET /api/health`
- **Database Readiness & Latency**: `GET /api/health/db`
- **Observability**: Every request is tagged with an `x-request-id` HTTP header and recorded via structured JSON logs.
