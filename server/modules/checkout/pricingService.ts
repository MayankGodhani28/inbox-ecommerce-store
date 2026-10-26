import { prisma } from '../../db/prisma.js';

export interface QuoteInputItem {
  productId: string;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

export interface QuoteRequest {
  items?: QuoteInputItem[];
  deliveryMethod?: 'Standard' | 'Express';
  couponCode?: string;
  userId?: string;
}

export interface AuthoritativeQuote {
  items: Array<{
    productId: string;
    name: string;
    brand: string;
    category: string;
    image: string;
    price: number;
    priceMinor: number;
    quantity: number;
    lineTotal: number;
    lineTotalMinor: number;
    selectedColor?: string;
    selectedSize?: string;
    stock: number;
  }>;
  totalItemsCount: number;
  subtotal: number;
  subtotalMinor: number;
  discount: number;
  discountMinor: number;
  deliveryFee: number;
  deliveryFeeMinor: number;
  tax: number;
  taxMinor: number;
  total: number;
  totalMinor: number;
  deliveryMethod: 'Standard' | 'Express';
  appliedCoupon: {
    id: string;
    code: string;
    description: string;
    discountPercentage: number;
    minSpend: number;
    maxDiscount?: number;
    freeShipping: boolean;
  } | null;
  couponError?: string;
  warnings: string[];
}

export async function calculateAuthoritativeQuote(request: QuoteRequest): Promise<AuthoritativeQuote> {
  if ((request.items !== undefined && !Array.isArray(request.items))
    || (request.couponCode !== undefined && typeof request.couponCode !== 'string')) {
    throw Object.assign(new Error('Items must be an array and couponCode must be a string'), { status: 400 });
  }
  const deliveryMethod = request.deliveryMethod === 'Express' ? 'Express' : 'Standard';
  const warnings: string[] = [];

  let inputItems: QuoteInputItem[] = [];

  if (request.items && Array.isArray(request.items)) {
    inputItems = request.items;
  } else if (request.userId) {
    // Load from database cart
    const dbCartItems = await prisma.cartItem.findMany({
      where: { userId: request.userId, product: { isArchived: false } },
      include: { product: true },
    });
    inputItems = dbCartItems.map((ci) => ({
      productId: ci.productId,
      quantity: ci.quantity,
      selectedColor: ci.selectedColor,
      selectedSize: ci.selectedSize,
    }));
  }

  // Authoritative item calculation
  const validatedItems: AuthoritativeQuote['items'] = [];
  let subtotalMinor = 0;
  let totalItemsCount = 0;

  if (inputItems.length > 100 || inputItems.some((it) => !it
    || typeof it.productId !== 'string' || !Number.isSafeInteger(it.quantity) || it.quantity <= 0)) {
    throw Object.assign(new Error('At most 100 items with positive integer quantities are allowed'), { status: 400 });
  }
  const products = await prisma.product.findMany({
    where: { id: { in: [...new Set(inputItems.map((item) => item.productId))] } },
  });
  const productsById = new Map(products.map((product) => [product.id, product]));

  for (const it of inputItems) {
    const product = productsById.get(it.productId);

    if (!product || product.isArchived) {
      warnings.push(`Product "${it.productId}" is no longer available and was excluded from quote.`);
      continue;
    }

    if (product.stock <= 0) {
      warnings.push(`Product "${product.name}" is out of stock and was excluded from quote.`);
      continue;
    }

    let qty = it.quantity;
    if (qty > product.stock) {
      warnings.push(`Quantity for "${product.name}" was adjusted to available stock (${product.stock}).`);
      qty = product.stock;
    }

    const priceMinor = product.price; // minor units in DB
    const lineTotalMinor = priceMinor * qty;
    subtotalMinor += lineTotalMinor;
    totalItemsCount += qty;

    const images = Array.isArray(product.images) ? (product.images as string[]) : [];

    validatedItems.push({
      productId: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      image: images[0] || '',
      price: priceMinor / 100,
      priceMinor,
      quantity: qty,
      lineTotal: lineTotalMinor / 100,
      lineTotalMinor,
      selectedColor: it.selectedColor || undefined,
      selectedSize: it.selectedSize || undefined,
      stock: product.stock,
    });
  }

  // Evaluate coupon
  let appliedCoupon: AuthoritativeQuote['appliedCoupon'] = null;
  let couponError: string | undefined;
  let discountMinor = 0;
  let freeShipping = false;

  if (request.couponCode && request.couponCode.trim()) {
    const code = request.couponCode.trim().toUpperCase();
    const coupon = await prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon || !coupon.isActive) {
      couponError = `Invalid or inactive coupon code "${code}".`;
    } else if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      couponError = `Coupon "${code}" has reached its maximum usage limit.`;
    } else if (request.userId) {
      const priorRedemption = await prisma.couponRedemption.findFirst({
        where: {
          couponId: coupon.id,
          userId: request.userId,
        },
      });
      if (priorRedemption) {
        couponError = `You have already redeemed coupon "${code}".`;
      }
    }

    if (!couponError && coupon) {
      if (subtotalMinor < coupon.minSpend) {
        const requiredDollars = (coupon.minSpend / 100).toFixed(2);
        couponError = `Coupon "${code}" requires a minimum spend of $${requiredDollars}.`;
      } else {
        // Valid coupon
        freeShipping = coupon.freeShipping;

        if (coupon.discountPercentage > 0) {
          const rawDiscount = Math.round((subtotalMinor * coupon.discountPercentage) / 100);
          if (coupon.maxDiscount && rawDiscount > coupon.maxDiscount) {
            discountMinor = coupon.maxDiscount;
          } else {
            discountMinor = rawDiscount;
          }
        }

        appliedCoupon = {
          id: coupon.id,
          code: coupon.code,
          description: coupon.description,
          discountPercentage: coupon.discountPercentage,
          minSpend: coupon.minSpend / 100,
          maxDiscount: coupon.maxDiscount ? coupon.maxDiscount / 100 : undefined,
          freeShipping: coupon.freeShipping,
        };
      }
    }
  }

  // Delivery calculation (consistent across cart and checkout)
  let deliveryFeeMinor = 0;
  if (totalItemsCount > 0) {
    const qualifiesForFreeOrReduced = subtotalMinor >= 7500 || freeShipping;
    if (deliveryMethod === 'Express') {
      deliveryFeeMinor = qualifiesForFreeOrReduced ? 499 : 1299; // $4.99 or $12.99
    } else {
      deliveryFeeMinor = qualifiesForFreeOrReduced ? 0 : 499; // Free or $4.99
    }
  }

  // Tax calculation (8% on taxable amount)
  const taxableAmountMinor = Math.max(0, subtotalMinor - discountMinor);
  const taxMinor = totalItemsCount > 0 ? Math.round(taxableAmountMinor * 0.08) : 0;

  // Final Total
  const totalMinor = totalItemsCount > 0 ? taxableAmountMinor + deliveryFeeMinor + taxMinor : 0;

  return {
    items: validatedItems,
    totalItemsCount,
    subtotal: subtotalMinor / 100,
    subtotalMinor,
    discount: discountMinor / 100,
    discountMinor,
    deliveryFee: deliveryFeeMinor / 100,
    deliveryFeeMinor,
    tax: taxMinor / 100,
    taxMinor,
    total: totalMinor / 100,
    totalMinor,
    deliveryMethod,
    appliedCoupon,
    couponError,
    warnings,
  };
}
