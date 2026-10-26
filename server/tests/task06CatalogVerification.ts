import { csrfFetch } from './httpClient.js';
import { createApp } from '../app.js';
import { prisma } from '../db/prisma.js';
import type { Server } from 'http';

async function runCatalogTests() {
  console.log('[Task 06 Verification] Starting Catalog & Admin Inventory acceptance checks...');
  const app = createApp();

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}`;

  const customerEmail = `cust_cat_${Date.now()}@inbox.com`;
  const adminEmail = `admin_cat_${Date.now()}@inbox.com`;
  const password = 'TestPassword123!';

  try {
    // 1. Setup Customer and Admin accounts
    const regRes = await csrfFetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Catalog Customer', email: customerEmail, password }),
    });
    const customerCookie = regRes.headers.get('set-cookie')!.split(';')[0];

    // Bootstrap an admin user in DB
    const adminUser = await prisma.user.create({
      data: {
        name: 'Catalog Admin',
        email: adminEmail,
        passwordHash: 'dummy',
        role: 'ADMIN',
      },
    });
    const adminLoginRes = await csrfFetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@inbox.com', password: 'AdminSecure2026!' }),
    });
    const adminCookie = adminLoginRes.headers.get('set-cookie')!.split(';')[0];
    console.log('✓ Customer and Admin sessions initialized.');

    // 2. Catalog read with filters, search, and pagination
    const catListRes = await csrfFetch(`${baseUrl}/api/products?category=Electronics&pageSize=5`);
    if (catListRes.status !== 200) {
      throw new Error(`Failed to fetch catalog list, status ${catListRes.status}`);
    }
    const catListData = ((await catListRes.json()) as any).data;
    if (!Array.isArray(catListData.products) || catListData.products.length === 0) {
      throw new Error('Expected products in Electronics category!');
    }
    if (catListData.pageSize !== 5) {
      throw new Error(`Expected pageSize 5, got ${catListData.pageSize}`);
    }
    if (typeof catListData.total !== 'number' || catListData.total <= 0) {
      throw new Error('Expected positive total count');
    }
    console.log(`✓ Catalog read, pagination, and category filter verified (Total: ${catListData.total}).`);

    // Search query test
    const searchRes = await csrfFetch(`${baseUrl}/api/products?search=Headphones`);
    const searchData = ((await searchRes.json()) as any).data;
    if (!searchData.products.some((p: any) => p.name.toLowerCase().includes('headphones'))) {
      throw new Error('Search did not match expected product title!');
    }
    console.log('✓ Catalog search verified.');

    // 3. Customer attempts to write to Admin endpoints (MUST BE 403 FORBIDDEN)
    const custWriteRes = await csrfFetch(`${baseUrl}/api/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customerCookie },
      body: JSON.stringify({
        name: 'Unauthorized Product',
        price: 99.99,
        stock: 10,
      }),
    });
    if (custWriteRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for customer writing to admin endpoint, got ${custWriteRes.status}`);
    }
    console.log('✓ Customer write to admin product endpoint rejected with HTTP 403 Forbidden.');

    // 4. Admin creates a new product with validation checks
    // Validation check: negative stock rejected
    const badStockRes = await csrfFetch(`${baseUrl}/api/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        name: 'Bad Stock Item',
        price: 50,
        stock: -5,
      }),
    });
    if (badStockRes.status !== 400) {
      throw new Error(`Expected 400 for negative stock, got ${badStockRes.status}`);
    }
    console.log('✓ Negative stock rejected with HTTP 400.');

    // Validation check: negative/zero price rejected
    const badPriceRes = await csrfFetch(`${baseUrl}/api/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        name: 'Free Item',
        price: -10,
        stock: 5,
      }),
    });
    if (badPriceRes.status !== 400) {
      throw new Error(`Expected 400 for negative price, got ${badPriceRes.status}`);
    }
    console.log('✓ Invalid price rejected with HTTP 400.');

    // Valid admin creation
    const newProdRes = await csrfFetch(`${baseUrl}/api/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        name: 'Pro Wireless Gaming Mouse',
        brand: 'HyperPulse',
        category: 'Electronics',
        description: 'Ultra-lightweight sensor mouse with 30K DPI and 80-hour battery life.',
        price: 89.99,
        originalPrice: 119.99,
        stock: 50,
        images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80'],
      }),
    });
    if (newProdRes.status !== 201) {
      throw new Error(`Admin product creation failed with status ${newProdRes.status}`);
    }
    const createdProd = ((await newProdRes.json()) as any).data.product;
    if (createdProd.price !== 89.99) {
      throw new Error(`Price conversion mismatch! Expected 89.99, got ${createdProd.price}`);
    }
    console.log('✓ Admin product creation succeeded with minor unit conversion.');

    // 5. Admin updates inventory stock
    const updateStockRes = await csrfFetch(`${baseUrl}/api/admin/products/${createdProd.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ stock: 25 }),
    });
    if (updateStockRes.status !== 200) {
      throw new Error(`Failed to update stock, status ${updateStockRes.status}`);
    }
    const updatedProd = ((await updateStockRes.json()) as any).data.product;
    if (updatedProd.stock !== 25) {
      throw new Error(`Expected updated stock 25, got ${updatedProd.stock}`);
    }
    console.log('✓ Admin stock update verified in database.');

    // 6. Safe archiving: DELETE /api/admin/products/:id marks isArchived: true
    const archiveRes = await csrfFetch(`${baseUrl}/api/admin/products/${createdProd.id}`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie },
    });
    if (archiveRes.status !== 200) {
      throw new Error(`Failed to archive product, status ${archiveRes.status}`);
    }

    // Verify archived product is no longer returned in public catalog listing
    const publicCatRes = await csrfFetch(`${baseUrl}/api/products`);
    const publicProducts = ((await publicCatRes.json()) as any).data.products;
    if (publicProducts.some((p: any) => p.id === createdProd.id)) {
      throw new Error('Archived product is still visible in public catalog!');
    }
    console.log('✓ Product archived safely; excluded from public catalog browse.');

    // Clean up
    await prisma.product.delete({ where: { id: createdProd.id } });
    await prisma.session.deleteMany({ where: { user: { email: { in: [customerEmail, adminEmail] } } } });
    await prisma.user.deleteMany({ where: { email: { in: [customerEmail, adminEmail] } } });

    console.log('[Task 06 Verification] All Catalog and Admin Inventory tests passed successfully!');
  } finally {
    server.close();
  }
}

runCatalogTests()
  .catch((err) => {
    console.error('[Task 06 Verification Failed]:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
