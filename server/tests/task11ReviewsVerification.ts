import { csrfFetch } from './httpClient.js';
import { prisma } from '../db/prisma';

const API_BASE = 'http://localhost:4000/api';

interface ApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

async function request(path: string, options: RequestInit = {}): Promise<{ status: number; body: ApiResponse; headers: Headers }> {
  const res = await csrfFetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const body = (await res.json().catch(() => ({}))) as ApiResponse;
  return { status: res.status, body, headers: res.headers };
}

function extractCookie(headers: Headers): string {
  const setCookie = headers.get('set-cookie');
  if (!setCookie) return '';
  const match = setCookie.match(/inbox_session_id=([^;]+)/);
  return match ? `inbox_session_id=${match[1]}` : '';
}

async function runTask11Verification() {
  console.log('[Task 11 Verification] Starting Reviews, Aggregates & Newsletter acceptance checks...\n');

  const runId = Date.now();
  const testProduct = await prisma.product.create({
    data: {
      id: `task11-prod-${runId}`,
      name: `Acoustic Pro Studio Monitor ${runId}`,
      brand: 'AudioTech',
      category: 'Electronics',
      description: 'Reference studio monitors for verification testing.',
      price: 19900,
      originalPrice: 24900,
      stock: 25,
      rating: 0,
      reviewCount: 0,
      specifications: {},
      images: ['https://images.unsplash.com/photo-1546435770-a3e426bf472b'],
    },
  });

  // 1. Anonymous review creation rejected
  const anonReviewRes = await request(`/products/${testProduct.id}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ rating: 5, comment: 'Anonymous review attempt' }),
  });
  if (anonReviewRes.status !== 401) {
    throw new Error(`Expected anonymous review to return 401 Unauthorized, got ${anonReviewRes.status}`);
  }
  console.log('✓ Anonymous review creation strictly rejected with 401 Unauthorized.');

  // Register Customer A & Customer B
  const customerAEmail = `reviewer_a_${runId}@example.com`;
  const customerBEmail = `reviewer_b_${runId}@example.com`;

  const regARes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Alice Walker', email: customerAEmail, password: 'SecurePassword2026!' }),
  });
  const cookieA = extractCookie(regARes.headers);

  const regBRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Bob Roberts', email: customerBEmail, password: 'SecurePassword2026!' }),
  });
  const cookieB = extractCookie(regBRes.headers);

  console.log('✓ Registered test accounts: Alice Walker (Customer A) and Bob Roberts (Customer B).');

  // 2. Rating range validation (must be 1-5)
  const invalidRatings = [0, 6, -1, 10, 'five'];
  for (const r of invalidRatings) {
    const res = await request(`/products/${testProduct.id}/reviews`, {
      method: 'POST',
      headers: { Cookie: cookieA },
      body: JSON.stringify({ rating: r, comment: 'Testing invalid rating range' }),
    });
    if (res.status !== 400) {
      throw new Error(`Expected rating ${r} to return 400, got ${res.status}`);
    }
  }
  console.log('✓ Invalid ratings (0, 6, -1, non-numeric) correctly rejected with 400.');

  // 3. Empty/whitespace comment rejection
  const emptyCommentRes = await request(`/products/${testProduct.id}/reviews`, {
    method: 'POST',
    headers: { Cookie: cookieA },
    body: JSON.stringify({ rating: 5, comment: '    ' }),
  });
  if (emptyCommentRes.status !== 400) {
    throw new Error(`Expected empty comment to return 400, got ${emptyCommentRes.status}`);
  }
  console.log('✓ Empty or whitespace-only comments rejected with 400.');

  // 4. Forged identity & verifiedPurchase tampering protection
  const forgedRes = await request(`/products/${testProduct.id}/reviews`, {
    method: 'POST',
    headers: { Cookie: cookieA },
    body: JSON.stringify({
      rating: 5,
      title: 'Initial Impression',
      comment: 'Super fast delivery and great sound stage!',
      userName: 'Forged Admin Authority',
      userId: 'forged-uuid-fake',
      verifiedPurchase: true, // Tampering attempt
    }),
  });

  if (forgedRes.status !== 201) {
    throw new Error(`Expected valid review to return 201, got ${forgedRes.status}`);
  }

  const reviewA = forgedRes.body.data.review;
  if (reviewA.userName !== 'Alice Walker') {
    throw new Error(`Forged userName accepted! Expected "Alice Walker", got "${reviewA.userName}"`);
  }
  if (reviewA.verifiedPurchase !== false) {
    throw new Error(`Client forged verifiedPurchase! Expected false, got ${reviewA.verifiedPurchase}`);
  }
  console.log('✓ Identity tampering rejected: Review attributed to authenticated user "Alice Walker", verifiedPurchase derived as false.');

  // 5. Check product rating aggregate after 1 review
  let dbProduct = await prisma.product.findUnique({ where: { id: testProduct.id } });
  if (dbProduct?.rating !== 5.0 || dbProduct?.reviewCount !== 1) {
    throw new Error(`Aggregate mismatch after 1st review: rating=${dbProduct?.rating}, count=${dbProduct?.reviewCount}`);
  }
  console.log('✓ Product aggregate dynamically updated: Rating = 5.0, ReviewCount = 1.');

  // 6. Customer B adds a 3-star review
  const reviewBRes = await request(`/products/${testProduct.id}/reviews`, {
    method: 'POST',
    headers: { Cookie: cookieB },
    body: JSON.stringify({
      rating: 3,
      title: 'Decent, but bass is punchy',
      comment: 'Audio quality is clean though low frequencies are a bit heavy for neutral mixing.',
    }),
  });

  if (reviewBRes.status !== 201) {
    throw new Error(`Expected Customer B review to return 201, got ${reviewBRes.status}`);
  }

  // Check product rating aggregate after 2 reviews: (5 + 3) / 2 = 4.0
  dbProduct = await prisma.product.findUnique({ where: { id: testProduct.id } });
  if (dbProduct?.rating !== 4.0 || dbProduct?.reviewCount !== 2) {
    throw new Error(`Aggregate mismatch after 2nd review: rating=${dbProduct?.rating}, count=${dbProduct?.reviewCount}`);
  }
  console.log('✓ Multi-user aggregate calculated: (5 + 3) / 2 = 4.0, ReviewCount = 2.');

  // 7. Duplicate submission updates existing review (deduplication)
  const updateReviewARes = await request(`/products/${testProduct.id}/reviews`, {
    method: 'POST',
    headers: { Cookie: cookieA },
    body: JSON.stringify({
      rating: 4,
      title: 'Updated After Burn-in',
      comment: 'Treble settled down nicely after 20 hours of burn-in.',
    }),
  });

  if (updateReviewARes.status !== 201) {
    throw new Error(`Expected review update to return 201, got ${updateReviewARes.status}`);
  }

  // Count reviews in DB for this product: must still be exactly 2
  const totalReviews = await prisma.review.count({ where: { productId: testProduct.id } });
  if (totalReviews !== 2) {
    throw new Error(`Duplicate review created! Expected 2 reviews, found ${totalReviews}`);
  }

  // Aggregate after update: (4 + 3) / 2 = 3.5
  dbProduct = await prisma.product.findUnique({ where: { id: testProduct.id } });
  if (dbProduct?.rating !== 3.5 || dbProduct?.reviewCount !== 2) {
    throw new Error(`Aggregate mismatch after review update: rating=${dbProduct?.rating}, count=${dbProduct?.reviewCount}`);
  }
  console.log('✓ Duplicate review update handled safely: Total reviews still 2, Aggregate updated to 3.5.');

  // 8. Server-derived verifiedPurchase when order exists
  // Create paid order for Customer A with testProduct
  const customerAUser = await prisma.user.findUnique({ where: { email: customerAEmail } });
  await prisma.order.create({
    data: {
      orderNumber: `INB-VERIF-${runId}`,
      userId: customerAUser!.id,
      customerName: 'Alice Walker',
      customerEmail: customerAEmail,
      customerPhone: '+1-555-0199',
      shippingAddress: { street: '123 Test St', city: 'Metropolis', postalCode: '12345', country: 'IN' },
      items: {
        create: {
          productId: testProduct.id,
          name: testProduct.name,
          unitPrice: 19900,
          quantity: 1,
          totalPrice: 19900,
          image: (testProduct.images as string[])[0] || 'https://images.unsplash.com/photo-1546435770-a3e426bf472b',
        },
      },
      deliveryMethod: 'STANDARD',
      subtotal: 19900,
      deliveryFee: 0,
      discount: 0,
      tax: 1592,
      total: 21492,
      paymentMethod: 'CASH_ON_DELIVERY',
      paymentStatus: 'Paid',
      status: 'Delivered',
    },
  });

  // Now Customer A updates their review again
  const verifiedReviewRes = await request(`/products/${testProduct.id}/reviews`, {
    method: 'POST',
    headers: { Cookie: cookieA },
    body: JSON.stringify({
      rating: 5,
      title: 'Verified Ownership Review',
      comment: 'Now that I received the order, I can confirm these are studio grade.',
    }),
  });

  if (verifiedReviewRes.status !== 201 || !verifiedReviewRes.body.data.review.verifiedPurchase) {
    throw new Error('Expected review to derive verifiedPurchase: true after qualifying delivered/paid order');
  }
  console.log('✓ Server-derived verifiedPurchase: Successfully derived verifiedPurchase = true from qualifying paid/delivered order.');

  // 9. Helpful count increment
  const helpfulRes = await request(`/products/${testProduct.id}/reviews/${reviewA.id}/helpful`, {
    method: 'POST',
  });
  if (helpfulRes.status !== 200 || helpfulRes.body.data.helpfulCount !== 1) {
    throw new Error(`Expected helpfulCount = 1, got ${helpfulRes.body?.data?.helpfulCount}`);
  }

  const helpfulRes2 = await request(`/products/${testProduct.id}/reviews/${reviewA.id}/helpful`, {
    method: 'POST',
  });
  if (helpfulRes2.status !== 200 || helpfulRes2.body.data.helpfulCount !== 2) {
    throw new Error(`Expected helpfulCount = 2, got ${helpfulRes2.body?.data?.helpfulCount}`);
  }
  console.log('✓ Helpful count increment verified: 0 -> 1 -> 2.');

  // 10. Newsletter subscription validation & database persistence
  // Invalid email
  const invalidEmailRes = await request('/newsletter/subscribe', {
    method: 'POST',
    body: JSON.stringify({ email: 'invalid-email-address' }),
  });
  if (invalidEmailRes.status !== 400) {
    throw new Error(`Expected invalid newsletter email to return 400, got ${invalidEmailRes.status}`);
  }

  // Valid email
  const newsletterEmail = `subscriber_${runId}@domain.com`;
  const validEmailRes = await request('/newsletter/subscribe', {
    method: 'POST',
    body: JSON.stringify({ email: newsletterEmail }),
  });
  if (validEmailRes.status !== 200 || !validEmailRes.body.data.subscribed) {
    throw new Error(`Expected valid newsletter subscription to succeed, got ${validEmailRes.status}`);
  }

  // Verify in PostgreSQL table
  const subInDb = await prisma.newsletterSubscription.findUnique({
    where: { email: newsletterEmail },
  });
  if (!subInDb || !subInDb.isActive) {
    throw new Error('Newsletter subscription not found in PostgreSQL NewsletterSubscription table');
  }

  // Check GET /api/newsletter/status
  const statusRes = await request(`/newsletter/status?email=${encodeURIComponent(newsletterEmail)}`);
  if (statusRes.status !== 200 || !statusRes.body.data.isSubscribed) {
    throw new Error('GET /api/newsletter/status failed to confirm subscription');
  }
  console.log('✓ Newsletter subscription validated and persisted in PostgreSQL (email: ' + newsletterEmail + ').');

  // Clean up test product
  await prisma.review.deleteMany({ where: { productId: testProduct.id } });
  await prisma.orderItem.deleteMany({ where: { productId: testProduct.id } });
  await prisma.product.delete({ where: { id: testProduct.id } });

  console.log('\n========================================');
  console.log(' ALL TASK 11 ACCEPTANCE CHECKS PASSED! ');
  console.log('========================================\n');
}

runTask11Verification()
  .catch((err) => {
    console.error('\n❌ Task 11 Verification FAILED:\n', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
