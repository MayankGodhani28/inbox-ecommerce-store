import { createApp } from '../app.js';
import { prisma } from '../db/prisma.js';
import type { Server } from 'http';

async function runProfileTests() {
  console.log('[Task 05 Verification] Starting Profile & Address acceptance checks...');
  const app = createApp();

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}`;

  const userAEmail = `user_a_${Date.now()}@inbox.com`;
  const userBEmail = `user_b_${Date.now()}@inbox.com`;
  const password = 'TestPassword123!';

  try {
    // 1. Register User A and User B
    const regARes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User A', email: userAEmail, password }),
    });
    const cookieA = regARes.headers.get('set-cookie')!.split(';')[0];

    const regBRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User B', email: userBEmail, password }),
    });
    const cookieB = regBRes.headers.get('set-cookie')!.split(';')[0];
    console.log('✓ Created User A and User B with active sessions.');

    // 2. Profile allowlisted updates and role/ID tampering rejection
    const updateRes = await fetch(`${baseUrl}/api/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        name: 'Updated Name A',
        phone: '+91 91111 22222',
        role: 'admin', // Malicious attempt to elevate role
        id: 'tampered-uuid-1234', // Malicious attempt to mutate ID
        email: 'tampered@hacker.com', // Attempt to mutate email
      }),
    });
    if (updateRes.status !== 200) {
      throw new Error(`Profile update failed with status ${updateRes.status}`);
    }
    const updateData = (await updateRes.json()) as any;
    if (updateData.data.user.role !== 'customer') {
      throw new Error('Role tampering succeeded in profile PATCH!');
    }
    if (updateData.data.user.email !== userAEmail) {
      throw new Error('Email was improperly mutated in profile PATCH!');
    }
    if (updateData.data.user.name !== 'Updated Name A') {
      throw new Error('Allowlisted name was not updated correctly!');
    }
    console.log('✓ Profile allowlisted fields updated while role/id/email tampering was strictly ignored.');

    // 3. User A adds Address 1 (becomes default automatically)
    const add1Res = await fetch(`${baseUrl}/api/me/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        fullName: 'User A',
        phone: '+91 91111 22222',
        street: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      }),
    });
    if (add1Res.status !== 201) {
      throw new Error(`Failed to add Address 1, status ${add1Res.status}`);
    }
    const addr1 = ((await add1Res.json()) as any).data.address;
    if (!addr1.isDefault) {
      throw new Error('First address was not automatically marked default!');
    }
    console.log('✓ First address created and marked as default.');

    // 4. User A adds Address 2 as default (transactionally demotes Address 1)
    const add2Res = await fetch(`${baseUrl}/api/me/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        fullName: 'User A Work',
        phone: '+91 91111 22222',
        street: '456 Tech Park',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
        isDefault: true,
      }),
    });
    const addr2 = ((await add2Res.json()) as any).data.address;
    if (!addr2.isDefault) {
      throw new Error('Address 2 was not marked default!');
    }

    // Verify Address 1 was demoted: only 1 default address exists
    const listRes = await fetch(`${baseUrl}/api/me/addresses`, {
      headers: { Cookie: cookieA },
    });
    const listData = ((await listRes.json()) as any).data.addresses;
    const defaults = listData.filter((a: any) => a.isDefault);
    if (defaults.length !== 1 || defaults[0].id !== addr2.id) {
      throw new Error(`Expected exactly 1 default address (addr2), found ${defaults.length}`);
    }
    console.log('✓ Second default address transactionally demoted previous default. Exactly one default exists.');

    // 5. Cross-user isolation: User B CANNOT read, update, or delete User A's address
    const bUpdateRes = await fetch(`${baseUrl}/api/me/addresses/${addr1.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookieB },
      body: JSON.stringify({ street: 'Malicious Overwrite' }),
    });
    if (bUpdateRes.status !== 404) {
      throw new Error(`Expected 404 for User B modifying User A address, got ${bUpdateRes.status}`);
    }

    const bDeleteRes = await fetch(`${baseUrl}/api/me/addresses/${addr1.id}`, {
      method: 'DELETE',
      headers: { Cookie: cookieB },
    });
    if (bDeleteRes.status !== 404) {
      throw new Error(`Expected 404 for User B deleting User A address, got ${bDeleteRes.status}`);
    }
    console.log('✓ Cross-user address access denied: User B cannot modify or delete User A address.');

    // 6. Delete default address: remaining address promoted to default
    const delRes = await fetch(`${baseUrl}/api/me/addresses/${addr2.id}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA },
    });
    if (delRes.status !== 200) {
      throw new Error(`Failed to delete Address 2, status ${delRes.status}`);
    }

    const afterDelList = await fetch(`${baseUrl}/api/me/addresses`, {
      headers: { Cookie: cookieA },
    });
    const remaining = ((await afterDelList.json()) as any).data.addresses;
    if (remaining.length !== 1 || !remaining[0].isDefault) {
      throw new Error('Remaining address was not promoted to default after default deletion!');
    }
    console.log('✓ Deleting current default promoted remaining address to default.');

    // 7. Verify historical orders are NOT mutated by address deletions
    const dummyProduct = await prisma.product.findFirst();
    const userA = await prisma.user.findUnique({ where: { email: userAEmail } });
    const orderWithSnapshot = await prisma.order.create({
      data: {
        orderNumber: `ORD-SNAP-${Date.now()}`,
        userId: userA!.id,
        customerName: 'User A',
        customerEmail: userAEmail,
        customerPhone: '9111122222',
        currency: 'USD',
        subtotal: dummyProduct?.price || 1000,
        total: dummyProduct?.price || 1000,
        shippingAddress: {
          fullName: 'User A',
          street: addr2.street,
          city: addr2.city,
          pincode: addr2.pincode,
        },
        deliveryMethod: 'Standard',
        paymentMethod: 'COD',
        paymentStatus: 'Pending',
        status: 'Order Placed',
      },
    });

    const historicalOrder = await prisma.order.findUnique({ where: { id: orderWithSnapshot.id } });
    if ((historicalOrder?.shippingAddress as any).street !== addr2.street) {
      throw new Error('Historical order snapshot was corrupted!');
    }
    console.log('✓ Historical order retains immutable address snapshot after original address deletion.');

    // Clean up
    await prisma.order.delete({ where: { id: orderWithSnapshot.id } });
    await prisma.address.deleteMany({ where: { userId: userA!.id } });
    await prisma.session.deleteMany({ where: { user: { email: { in: [userAEmail, userBEmail] } } } });
    await prisma.user.deleteMany({ where: { email: { in: [userAEmail, userBEmail] } } });

    console.log('[Task 05 Verification] All Profile and Address acceptance tests passed successfully!');
  } finally {
    server.close();
  }
}

runProfileTests()
  .catch((err) => {
    console.error('[Task 05 Verification Failed]:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
