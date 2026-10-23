const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sellerId" TEXT;');
  await prisma.$executeRawUnsafe('ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "storeName" TEXT;');
  console.log('Columns added successfully to Product');
}

main().catch(console.error).finally(() => prisma.$disconnect());
