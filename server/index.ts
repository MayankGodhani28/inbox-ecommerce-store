import { createApp } from './app.js';
import { getEnv } from './config/env.js';
import { disconnectDb } from './db/prisma.js';
import type { Server } from 'http';

const env = getEnv();
const app = createApp();

let server: Server | null = null;

server = app.listen(env.PORT, () => {
  console.log(`[Server] Inbox Backend running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
});

let isShuttingDown = false;

async function handleShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);

  if (server) {
    server.close(() => {
      console.log('[Server] HTTP server closed.');
    });
  }

  try {
    await disconnectDb();
    console.log('[Server] Database disconnected cleanly.');
  } catch (err) {
    console.error('[Server] Error disconnecting database:', err);
  }

  process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
