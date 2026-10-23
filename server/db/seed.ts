import { PrismaClient } from '@prisma/client';
import { INITIAL_PRODUCTS } from '../../src/data/products.js';
import { AVAILABLE_COUPONS } from '../../src/data/coupons.js';

const prisma = new PrismaClient();

export async function seed() {
  console.log('[Seed] Starting database seed...');

  // 1. Seed Products idempotently
  let productsCount = 0;
  for (const p of INITIAL_PRODUCTS) {
    const priceCents = Math.round(p.price * 100);
    const originalPriceCents = Math.round((p.originalPrice || p.price) * 100);

    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        brand: p.brand,
        category: p.category,
        description: p.description,
        price: priceCents,
        originalPrice: originalPriceCents,
        discount: p.discount || 0,
        rating: p.rating || 0,
        reviewCount: p.reviewCount || 0,
        stock: p.stock ?? 0,
        images: p.images || [],
        colors: p.colors || [],
        sizes: p.sizes || [],
        specifications: p.specifications || {},
        isTrending: !!p.isTrending,
        isBestSeller: !!p.isBestSeller,
        isNewArrival: !!p.isNewArrival,
        isDealOfDay: !!p.isDealOfDay,
        isArchived: false,
      },
      create: {
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        description: p.description,
        price: priceCents,
        originalPrice: originalPriceCents,
        discount: p.discount || 0,
        rating: p.rating || 0,
        reviewCount: p.reviewCount || 0,
        stock: p.stock ?? 0,
        images: p.images || [],
        colors: p.colors || [],
        sizes: p.sizes || [],
        specifications: p.specifications || {},
        isTrending: !!p.isTrending,
        isBestSeller: !!p.isBestSeller,
        isNewArrival: !!p.isNewArrival,
        isDealOfDay: !!p.isDealOfDay,
        isArchived: false,
      },
    });
    productsCount++;
  }
  console.log(`[Seed] Successfully seeded ${productsCount} products.`);

  // 2. Seed Coupons idempotently
  let couponsCount = 0;
  for (const c of AVAILABLE_COUPONS) {
    const normalizedCode = c.code.trim().toUpperCase();
    const minSpendCents = Math.round((c.minSpend || 0) * 100);
    const maxDiscountCents = c.maxDiscount ? Math.round(c.maxDiscount * 100) : null;

    await prisma.coupon.upsert({
      where: { code: normalizedCode },
      update: {
        description: c.description,
        discountPercentage: c.discountPercentage || 0,
        minSpend: minSpendCents,
        maxDiscount: maxDiscountCents,
        freeShipping: !!c.freeShipping,
        isActive: true,
      },
      create: {
        code: normalizedCode,
        description: c.description,
        discountPercentage: c.discountPercentage || 0,
        minSpend: minSpendCents,
        maxDiscount: maxDiscountCents,
        freeShipping: !!c.freeShipping,
        isActive: true,
      },
    });
    couponsCount++;
  }
  console.log(`[Seed] Successfully seeded ${couponsCount} coupons.`);
  console.log('[Seed] Database seed completed successfully.');
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seed()
    .catch((err) => {
      console.error('[Seed] Error during seeding:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
