# Multi-stage production Dockerfile for Inbox E-commerce Store
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy schema and generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Copy project source
COPY . .

# Build Vite frontend and Express TypeScript server
RUN npm run build
RUN npm run server:build

# Production Runtime Stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy generated prisma client and migrations
COPY prisma ./prisma
RUN npx prisma generate

# Copy compiled bundles and static assets
COPY --from=builder /app/dist ./dist

# Create unprivileged user
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

CMD ["node", "dist/server/index.js"]
