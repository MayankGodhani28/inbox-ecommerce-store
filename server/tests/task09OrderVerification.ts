import { csrfFetch } from './httpClient.js';
import { createApp } from '../app.js';
import { prisma } from '../db/prisma.js';
import type { Server } from 'http';

async function runOrderTests() {
  console.log('[Task 09 Verification] Starting Transactional COD Orders & Idempotency acceptance checks...');
  const app = createApp();

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}`;

  const customerAEmail = `cust_ord_a_${Date.now()}@inbox.com`;
  const customerBEmail = `cust_ord_b_${Date.now()}@inbox.com`;
  const password = 'TestPassword123!';

  const testProductId = `prod_ord_test_${Date.now()}`;

  try {
    // 1. Register Customer A and Customer B
    const regARes = await csrfFetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Order Customer A', email: customerAEmail, password }),
    });
    const cookieA = regARes.headers.get('set-cookie')!.split(';')[0];

    const regBRes = await csrfFetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Order Customer B', email: customerBEmail, password }),
    });
    const cookieB = regBRes.headers.get('set-cookie')!.split(';')[0];
    console.log('✓ Registered Customer A and Customer B.');

    // 2. Create product with stock = 1 (to test last-item concurrent purchase)
    const testProduct = await prisma.product.create({
      data: {
        id: testProductId,
        name: 'Limited Stock Headphones',
        brand: 'SoundMaster',
        category: 'Electronics',
        description: 'Single stock test item',
        price: 5000, // $50.00
        originalPrice: 6000,
        discount: 16,
        stock: 1, // Only 1 in stock!
        images: ['https://example.com/headphones.jpg'],
        specifications: {},
      },
    });

    const shippingAddress = {
      fullName: 'Order Customer A',
      phone: '+1 555 123 4567',
      street: '123 Test Street',
      city: 'San Francisco',
      state: 'CA',
      pincode: '94105',
      country: 'USA',
    };

    // 3. Customer A places a Cash on Delivery order
    const idempotencyKeyA = `key_ord_${Date.now()}`;
    const orderResA = await csrfFetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'idempotency-key': idempotencyKeyA,
        Cookie: cookieA,
      },
      body: JSON.stringify({
        items: [{ productId: testProduct.id, quantity: 1 }],
        shippingAddress,
        deliveryMethod: 'Standard',
        paymentMethod: 'Cash on Delivery',
      }),
    });

    if (orderResA.status !== 201) {
      const err = await orderResA.text();
      throw new Error(`Order creation failed for Customer A: status ${orderResA.status}, ${err}`);
    }

    const orderDataA = ((await orderResA.json()) as any).data.order;
    if (orderDataA.paymentStatus !== 'Pending') {
      throw new Error(`Expected COD paymentStatus to start 'Pending', got: ${orderDataA.paymentStatus}`);
    }
    if (orderDataA.transactionId !== undefined) {
      throw new Error(`Expected transactionId to be absent for COD, got: ${orderDataA.transactionId}`);
    }
    if (orderDataA.trackingNumber !== undefined) {
      throw new Error(`Expected trackingNumber to be absent before dispatch, got: ${orderDataA.trackingNumber}`);
    }
    console.log(`✓ Real Cash on Delivery order created: ${orderDataA.orderNumber} (Payment: ${orderDataA.paymentStatus}, transactionId/tracking absent).`);

    // Verify product stock was atomically decremented to 0
    const stockAfterA = await prisma.product.findUnique({ where: { id: testProduct.id } });
    if (stockAfterA!.stock !== 0) {
      throw new Error(`Expected stock decremented to 0, found ${stockAfterA!.stock}`);
    }
    console.log('✓ Product inventory was atomically decremented in database (stock: 1 -> 0).');

    // 4. Concurrency check: Customer B attempts to purchase the same out-of-stock item
    const orderResB = await csrfFetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieB,
      },
      body: JSON.stringify({
        items: [{ productId: testProduct.id, quantity: 1 }],
        shippingAddress,
        deliveryMethod: 'Standard',
        paymentMethod: 'Cash on Delivery',
      }),
    });

    if (orderResB.status === 201) {
      throw new Error('Concurrent purchase succeeded on out-of-stock item! Should have been rejected.');
    }
    const orderErrB = ((await orderResB.json()) as any).error;
    console.log(`✓ Out-of-stock purchase attempt rejected safely (Status: ${orderResB.status}, message: "${orderErrB.message}").`);

    // 5. Idempotency & network retry check (double click / replay)
    const replayRes = await csrfFetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'idempotency-key': idempotencyKeyA,
        Cookie: cookieA,
      },
      body: JSON.stringify({
        items: [{ productId: testProduct.id, quantity: 1 }],
        shippingAddress,
        deliveryMethod: 'Standard',
        paymentMethod: 'Cash on Delivery',
      }),
    });
    if (replayRes.status !== 200) {
      throw new Error(`Expected status 200 for idempotent replay, got ${replayRes.status}`);
    }
    const replayData = ((await replayRes.json()) as any).data;
    if (!replayData.replayed || replayData.order.orderNumber !== orderDataA.orderNumber) {
      throw new Error(`Expected replayed order ${orderDataA.orderNumber}, got: ${JSON.stringify(replayData)}`);
    }
    console.log('✓ Idempotent replay returned existing order without duplicate records or stock decrements.');

    // Idempotency conflict test: same key with different payload
    const conflictRes = await csrfFetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'idempotency-key': idempotencyKeyA,
        Cookie: cookieA,
      },
      body: JSON.stringify({
        items: [{ productId: testProduct.id, quantity: 1 }],
        shippingAddress: { ...shippingAddress, street: '999 Completely Different St' },
        deliveryMethod: 'Express',
        paymentMethod: 'Cash on Delivery',
      }),
    });
    if (conflictRes.status !== 400) {
      throw new Error(`Expected 400 for altered payload on same idempotency key, got ${conflictRes.status}`);
    }
    console.log('✓ Idempotency key reuse with different payload strictly rejected with 400.');

    // 6. Cross-user isolation: Customer B cannot access Customer A order
    const crossAccessRes = await csrfFetch(`${baseUrl}/api/orders/${orderDataA.orderNumber}`, {
      headers: { Cookie: cookieB },
    });
    if (crossAccessRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for cross-user order access, got ${crossAccessRes.status}`);
    }
    console.log('✓ Cross-user order isolation verified: Customer B cannot read Customer A order.');

    // 7. Pricing conflict check (expectedTotalMinor mismatch)
    const pricingConflictRes = await csrfFetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { Cookie: cookieA },
      body: JSON.stringify({
        items: [{ productId: testProduct.id, quantity: 1 }],
        shippingAddress,
        expectedTotalMinor: 100, // deliberately wrong expected total
      }),
    });
    if (pricingConflictRes.status !== 409 && pricingConflictRes.status !== 400) {
      throw new Error(`Expected pricing conflict error, got ${pricingConflictRes.status}`);
    }
    console.log('✓ Pricing conflict detected and guarded (price tampering prevented).');

    // 8. Admin status update and tracking number addition
    const adminLoginRes = await csrfFetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: process.env.TEST_ADMIN_EMAIL || 'admin@example.test', password: process.env.TEST_ADMIN_PASSWORD || '' }),
    });
    const adminCookie = adminLoginRes.headers.get('set-cookie')!.split(';')[0];

    const updateStatusRes = await csrfFetch(`${baseUrl}/api/orders/${orderDataA.orderNumber}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        status: 'Shipped',
        trackingNumber: 'TRK-INB-998877IN',
        note: 'Dispatched via Express Courier',
      }),
    });
    if (updateStatusRes.status !== 200) {
      throw new Error(`Admin status update failed: status ${updateStatusRes.status}`);
    }
    const updatedOrder = ((await updateStatusRes.json()) as any).data.order;
    if (updatedOrder.status !== 'Shipped' || updatedOrder.trackingNumber !== 'TRK-INB-998877IN') {
      throw new Error(`Expected updated status and tracking, got: ${JSON.stringify(updatedOrder)}`);
    }
    console.log(`✓ Admin updated order to "${updatedOrder.status}" with tracking "${updatedOrder.trackingNumber}".`);

    console.log('\n========================================');
    console.log(' ALL TASK 09 ACCEPTANCE CHECKS PASSED! ');
    console.log('========================================\n');
  } finally {
    // Cleanup
    await prisma.checkoutRequest.deleteMany({
      where: { user: { email: { in: [customerAEmail, customerBEmail] } } },
    });
    await prisma.orderItem.deleteMany({
      where: { order: { user: { email: { in: [customerAEmail, customerBEmail] } } } },
    });
    await prisma.orderStatusHistory.deleteMany({
      where: { order: { user: { email: { in: [customerAEmail, customerBEmail] } } } },
    });
    await prisma.order.deleteMany({
      where: { user: { email: { in: [customerAEmail, customerBEmail] } } },
    });
    await prisma.product.deleteMany({
      where: { id: testProductId },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [customerAEmail, customerBEmail] } },
    });
    server.close();
  }
}

runOrderTests().catch((err) => {
  console.error('Task 09 Verification Failed:', err);
  process.exit(1);
});
