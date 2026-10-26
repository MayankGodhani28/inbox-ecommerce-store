import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function checkDbConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database query failed';
    // Sanitize error message to prevent leaking credentials or connection details
    const sanitized = message.split('\n')[0].replace(/(postgresql:\/\/)[^@]+@/i, '$1***:***@');
    return { ok: false, latencyMs: Date.now() - start, error: sanitized };
  }
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
