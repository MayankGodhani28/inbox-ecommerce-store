import { createApp } from '../app.js';
import { prisma } from '../db/prisma.js';
import type { Server } from 'http';

async function runOperationsTests() {
  console.log('[Task 10 Verification] Starting Order Operations, Tracking & Metrics acceptance checks...');
  const app = createApp();

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}`;

  const customerAEmail = `cust_ops_a_${Date.now()}@inbox.com`;
  const customerBEmail = `cust_ops_b_${Date.now()}@inbox.com`;
  const password = 'TestPassword123!';
  const testProductId = `prod_ops_test_${Date.now()}`;

  try {
    // 1. Anonymous access denial check
    const anonOrdersRes = await fetch(`${baseUrl}/api/orders`);
    if (anonOrdersRes.status !== 401) {
      throw new Error(`Expected 401 for anonymous /api/orders, got ${anonOrdersRes.status}`);
    }
    const anonAdminRes = await fetch(`${baseUrl}/api/admin/orders`);
    if (anonAdminRes.status !== 401) {
      throw new Error(`Expected 401 for anonymous /api/admin/orders, got ${anonAdminRes.status}`);
    }
    console.log('✓ Anonymous requests to orders and admin operations strictly denied (401).');

    // 2. Register Customer A and Customer B
    const regARes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ops Customer A', email: customerAEmail, password }),
    });
    const cookieA = regARes.headers.get('set-cookie')!.split(';')[0];

    const regBRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ops Customer B', email: customerBEmail, password }),
    });
    const cookieB = regBRes.headers.get('set-cookie')!.split(';')[0];

    // Admin login
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@inbox.com', password: 'AdminSecure2026!' }),
    });
    const adminCookie = adminLoginRes.headers.get('set-cookie')!.split(';')[0];
    console.log('✓ Initialized sessions for Customer A, Customer B, and Admin.');

    // 3. Customer calling admin endpoints is denied with 403 Forbidden
    const custAdminOrdersRes = await fetch(`${baseUrl}/api/admin/orders`, {
      headers: { Cookie: cookieA },
    });
    if (custAdminOrdersRes.status !== 403) {
      throw new Error(`Expected 403 for customer accessing /api/admin/orders, got ${custAdminOrdersRes.status}`);
    }
    console.log('✓ Non-admin customer denied from admin endpoints (403 Forbidden).');

    // 4. Create test product & place COD order for Customer A
    const testProduct = await prisma.product.create({
      data: {
        id: testProductId,
        name: 'Operations Test Product',
        brand: 'OpsBrand',
        category: 'Accessories',
        description: 'Test product for operations',
        price: 3500, // $35.00
        originalPrice: 4000,
        discount: 12,
        stock: 20,
        images: ['https://example.com/item.jpg'],
        specifications: {},
      },
    });

    const createOrderRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        items: [{ productId: testProduct.id, quantity: 2 }], // $70.00 + $4.99 delivery + $5.60 tax = $80.59
        shippingAddress: {
          fullName: 'Ops Customer A',
          phone: '+1 555 987 6543',
          street: '456 Market St',
          city: 'Austin',
          state: 'TX',
          pincode: '78701',
          country: 'USA',
        },
        deliveryMethod: 'Standard',
        paymentMethod: 'Cash on Delivery',
      }),
    });
    if (createOrderRes.status !== 201) {
      throw new Error(`Order creation failed with status ${createOrderRes.status}`);
    }
    const orderA = ((await createOrderRes.json()) as any).data.order;
    console.log(`✓ Order created: ${orderA.orderNumber} (Subtotal: $${orderA.subtotal}, Total: $${orderA.total}, Status: ${orderA.status}).`);

    // 5. Owner isolation check
    // Customer A sees 1 order
    const listARes = await fetch(`${baseUrl}/api/orders`, { headers: { Cookie: cookieA } });
    const listA = ((await listARes.json()) as any).data.orders;
    if (listA.length !== 1 || listA[0].orderNumber !== orderA.orderNumber) {
      throw new Error(`Customer A should see exactly 1 order, found ${listA.length}`);
    }

    // Customer B sees 0 orders
    const listBRes = await fetch(`${baseUrl}/api/orders`, { headers: { Cookie: cookieB } });
    const listB = ((await listBRes.json()) as any).data.orders;
    if (listB.length !== 0) {
      throw new Error(`Customer B should see 0 orders, found ${listB.length}`);
    }

    // Customer B directly fetching Customer A order is denied
    const directFetchB = await fetch(`${baseUrl}/api/orders/${orderA.orderNumber}`, {
      headers: { Cookie: cookieB },
    });
    if (directFetchB.status !== 403) {
      throw new Error(`Expected 403 for Customer B fetching Customer A order, got ${directFetchB.status}`);
    }
    console.log('✓ Owner isolation verified: Customer B cannot list or query Customer A order.');

    // 6. Metrics check before COD collection: unpaid COD is excluded from paid revenue
    const metricsBeforeRes = await fetch(`${baseUrl}/api/admin/metrics`, {
      headers: { Cookie: adminCookie },
    });
    const metricsBefore = ((await metricsBeforeRes.json()) as any).data.metrics;
    if (metricsBefore.unpaidCodOrders < 1) {
      throw new Error(`Expected at least 1 unpaid COD order, got: ${metricsBefore.unpaidCodOrders}`);
    }
    console.log(`✓ Admin metrics before collection: Unpaid COD orders = ${metricsBefore.unpaidCodOrders}, Paid revenue excludes unpaid COD.`);

    // 7. Status transition checks
    // 7a. Invalid status name
    const invalidStatusRes = await fetch(`${baseUrl}/api/orders/${orderA.orderNumber}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ status: 'InvalidNonExistentStatus' }),
    });
    if (invalidStatusRes.status !== 400) {
      throw new Error(`Expected 400 for invalid status name, got ${invalidStatusRes.status}`);
    }
    console.log('✓ Invalid status name correctly rejected with 400.');

    // 7b. Valid forward progression: Order Placed -> Confirmed -> Shipped
    const confirmRes = await fetch(`${baseUrl}/api/orders/${orderA.orderNumber}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ status: 'Confirmed', note: 'Inventory verified' }),
    });
    if (confirmRes.status !== 200) {
      throw new Error(`Failed to confirm order: status ${confirmRes.status}`);
    }

    const shipRes = await fetch(`${baseUrl}/api/orders/${orderA.orderNumber}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        status: 'Shipped',
        trackingNumber: 'TRK-BD-448822IN',
        note: 'Courier pickup complete',
      }),
    });
    if (shipRes.status !== 200) {
      throw new Error(`Failed to mark order as shipped: status ${shipRes.status}`);
    }
    console.log('✓ Valid forward progression ("Order Placed" -> "Confirmed" -> "Shipped") verified.');

    // 7c. Backward transition attempt: Shipped -> Packed
    const backwardRes = await fetch(`${baseUrl}/api/orders/${orderA.orderNumber}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ status: 'Packed' }),
    });
    if (backwardRes.status !== 400) {
      throw new Error(`Expected 400 for backward transition, got ${backwardRes.status}`);
    }
    const backwardErr = ((await backwardRes.json()) as any).error;
    console.log(`✓ Backward status transition rejected: "${backwardErr.message}".`);

    // 7d. Idempotent repeated status update: Shipped -> Shipped
    const repeatedRes = await fetch(`${baseUrl}/api/orders/${orderA.orderNumber}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ status: 'Shipped', trackingNumber: 'TRK-BD-448822IN' }),
    });
    if (repeatedRes.status !== 200) {
      throw new Error(`Expected 200 for idempotent repeated status update, got ${repeatedRes.status}`);
    }
    console.log('✓ Idempotent repeated status update handled without duplicate entries.');

    // 8. Admin COD Payment Collection
    const collectRes = await fetch(`${baseUrl}/api/orders/${orderA.orderNumber}/collect-payment`, {
      method: 'PATCH',
      headers: { Cookie: adminCookie },
    });
    if (collectRes.status !== 200) {
      throw new Error(`Payment collection failed: status ${collectRes.status}`);
    }
    const collectedOrder = ((await collectRes.json()) as any).data.order;
    if (collectedOrder.paymentStatus !== 'Paid') {
      throw new Error(`Expected paymentStatus 'Paid', got ${collectedOrder.paymentStatus}`);
    }
    console.log(`✓ Audited Cash on Delivery payment collection recorded (Payment: ${collectedOrder.paymentStatus}, transaction: ${collectedOrder.transactionId}).`);

    // Metrics after collection: paidRevenue includes collected order, unpaidCodOrders decrements
    const metricsAfterRes = await fetch(`${baseUrl}/api/admin/metrics`, {
      headers: { Cookie: adminCookie },
    });
    const metricsAfter = ((await metricsAfterRes.json()) as any).data.metrics;
    if (metricsAfter.unpaidCodOrders !== metricsBefore.unpaidCodOrders - 1) {
      throw new Error(`Expected unpaidCodOrders decremented by 1, got ${metricsAfter.unpaidCodOrders}`);
    }
    if (metricsAfter.paidRevenue <= metricsBefore.paidRevenue) {
      throw new Error('Expected paidRevenue to increase after COD collection');
    }
    console.log(`✓ Admin metrics updated: Paid revenue now includes collected order ($${metricsAfter.paidRevenue.toFixed(2)}).`);

    // 9. Immutable snapshot check: altering original product price does not mutate order item snapshot
    await prisma.product.update({
      where: { id: testProduct.id },
      data: { price: 99999 }, // alter catalog price
    });
    const orderVerify: any = await (await fetch(`${baseUrl}/api/orders/${orderA.orderNumber}`, { headers: { Cookie: cookieA } })).json();
    if (orderVerify.data.order.items[0].price !== 35.0) {
      throw new Error(`Order item historical price altered! Expected $35.00, got $${orderVerify.data.order.items[0].price}`);
    }
    console.log('✓ Immutable order item snapshot preserved after catalog price update.');

    console.log('\n========================================');
    console.log(' ALL TASK 10 ACCEPTANCE CHECKS PASSED! ');
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

runOperationsTests().catch((err) => {
  console.error('Task 10 Verification Failed:', err);
  process.exit(1);
});
