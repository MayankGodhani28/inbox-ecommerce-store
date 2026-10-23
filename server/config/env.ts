import dotenv from 'dotenv';
dotenv.config();

export interface ServerEnv {
  PORT: number;
  DATABASE_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
  CLIENT_ORIGIN: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

export function validateEnv(): ServerEnv {
  const errors: string[] = [];

  const port = parseInt(process.env.PORT || '4000', 10);
  if (isNaN(port) || port <= 0) {
    errors.push('PORT must be a valid positive integer');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.trim() === '') {
    errors.push('DATABASE_URL is required (e.g. postgresql://user:pass@localhost:5432/inbox_store?schema=public)');
  }

  const nodeEnv = (process.env.NODE_ENV || 'development') as ServerEnv['NODE_ENV'];
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    errors.push("NODE_ENV must be one of 'development', 'production', or 'test'");
  }

  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

  if (errors.length > 0) {
    const message = `Environment validation failed:\n - ${errors.join('\n - ')}`;
    console.error(message);
    throw new Error(message);
  }

  return {
    PORT: port,
    DATABASE_URL: databaseUrl!,
    NODE_ENV: nodeEnv,
    CLIENT_ORIGIN: clientOrigin,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  };
}

let cachedEnv: ServerEnv | null = null;
export function getEnv(): ServerEnv {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}
