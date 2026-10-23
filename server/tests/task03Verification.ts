import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function runVerification() {
  console.log('[Verification] Starting Task 03 database constraint tests...');

  // Test 1: Verify admin user exists and password hash works
  const admin = await prisma.user.findUnique({ where: { email: 'admin@inbox.com' } });
  if (!admin || admin.role !== Role.ADMIN) {
    throw new Error('Admin user was not found or role is not ADMIN');
  }
  const passwordValid = await bcrypt.compare('AdminSecure2026!', admin.passwordHash);
  if (!passwordValid) {
    throw new Error('Admin password hash verification failed');
  }
  console.log('✓ Admin user verified with secure password hash.');

  // Test 2: Reject email duplicate
  let duplicateRejected = false;
  try {
    await prisma.user.create({
      data: {
        email: 'admin@inbox.com',
        name: 'Imposter',
        passwordHash: 'dummyhash123',
      },
    });
  } catch (err: unknown) {
    duplicateRejected = true;
  }
  if (!duplicateRejected) {
    throw new Error('Unique email constraint failed: duplicate user created!');
  }
  console.log('✓ Duplicate email rejected by unique constraint.');

  // Test 3: Create customer, product, order, and order item; then archive product
  const testCustomer = await prisma.user.upsert({
    where: { email: 'testcustomer@inbox.com' },
    update: {},
    create: {
      email: 'testcustomer@inbox.com',
      name: 'Test Customer',
      passwordHash: await bcrypt.hash('CustomerPass123!', 10),
      role: Role.CUSTOMER,
    },
  });

  const testProduct = await prisma.product.findFirst();
  if (!testProduct) throw new Error('No product found in catalog');

  const testOrder = await prisma.order.create({
    data: {
      orderNumber: `ORD-TEST-${Date.now()}`,
      userId: testCustomer.id,
      customerName: testCustomer.name,
      customerEmail: testCustomer.email,
      customerPhone: '1234567890',
      currency: 'USD',
      subtotal: testProduct.price,
      total: testProduct.price,
      shippingAddress: { city: 'Test City', street: '123 Test St' },
      deliveryMethod: 'Standard',
      paymentMethod: 'COD',
      paymentStatus: 'Pending',
      status: 'Order Placed',
      items: {
        create: {
          productId: testProduct.id,
          name: testProduct.name,
          image: (testProduct.images as string[])[0] || '',
          unitPrice: testProduct.price,
          quantity: 1,
          totalPrice: testProduct.price,
        },
      },
    },
    include: { items: true },
  });

  console.log(`✓ Order ${testOrder.orderNumber} created with 1 item.`);

  // Test 4: Archive product - order history must remain intact
  await prisma.product.update({
    where: { id: testProduct.id },
    data: { isArchived: true },
  });

  const orderAfterArchive = await prisma.order.findUnique({
    where: { id: testOrder.id },
    include: { items: true },
  });

  if (!orderAfterArchive || orderAfterArchive.items.length !== 1) {
    throw new Error('Order was mutated or lost when product was archived!');
  }
  console.log('✓ Product archived successfully while preserving historical order reference and item snapshots.');

  // Clean up test order and customer
  await prisma.order.delete({ where: { id: testOrder.id } });
  await prisma.user.delete({ where: { id: testCustomer.id } });
  // Restore product archive state
  await prisma.product.update({
    where: { id: testProduct.id },
    data: { isArchived: false },
  });

  console.log('[Verification] All Task 03 constraint and lifecycle checks passed cleanly!');
}

runVerification()
  .catch((err) => {
    console.error('[Verification Failed]:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
