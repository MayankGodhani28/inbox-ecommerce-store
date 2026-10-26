import { csrfFetch } from './httpClient.js';
import { createApp } from '../app.js';
import { prisma } from '../db/prisma.js';
import type { Server } from 'http';

async function runCartTests() {
  console.log('[Task 07 Verification] Starting Cart, Saved Items & Wishlist acceptance checks...');
  const app = createApp();

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}`;

  const customerAEmail = `cust_a_${Date.now()}@inbox.com`;
  const customerBEmail = `cust_b_${Date.now()}@inbox.com`;
  const password = 'TestPassword123!';

  try {
    // 1. Register Customer A
    const regARes = await csrfFetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Customer A', email: customerAEmail, password }),
    });
    if (regARes.status !== 201) {
      throw new Error(`Customer A registration failed: status ${regARes.status}`);
    }
    const cookieA = regARes.headers.get('set-cookie')!.split(';')[0];

    // Register Customer B
    const regBRes = await csrfFetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Customer B', email: customerBEmail, password }),
    });
    if (regBRes.status !== 201) {
      throw new Error(`Customer B registration failed: status ${regBRes.status}`);
    }
    const cookieB = regBRes.headers.get('set-cookie')!.split(';')[0];
    console.log('✓ Customer A and Customer B registered and authenticated.');

    // 2. Pick a test product
    const testProduct = await prisma.product.findFirst({
      where: { isArchived: false, stock: { gt: 5 } },
    });
    if (!testProduct) {
      throw new Error('No active test product found in database!');
    }

    // 3. Customer A adds product (size M, color Blue, qty 2)
    const addRes = await csrfFetch(`${baseUrl}/api/cart/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        productId: testProduct.id,
        quantity: 2,
        selectedColor: 'Blue',
        selectedSize: 'M',
      }),
    });
    if (addRes.status !== 201) {
      throw new Error(`Failed to add item to cart: status ${addRes.status}`);
    }

    const cartListA = await csrfFetch(`${baseUrl}/api/cart`, { headers: { Cookie: cookieA } });
    const cartAData = ((await cartListA.json()) as any).data;
    if (cartAData.items.length !== 1 || cartAData.items[0].quantity !== 2) {
      throw new Error(`Expected cart with 1 item of qty 2, got: ${JSON.stringify(cartAData)}`);
    }
    console.log('✓ Customer A added item to cart (qty 2, Blue, M).');

    // 4. Move to saved-for-later: cart becomes empty, saved items has 1 entry
    const saveRes = await csrfFetch(`${baseUrl}/api/saved-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        productId: testProduct.id,
        selectedColor: 'Blue',
        selectedSize: 'M',
        moveFromCart: true,
      }),
    });
    if (saveRes.status !== 201) {
      throw new Error(`Failed to save item for later: status ${saveRes.status}`);
    }

    const cartAfterSave = ((await (await csrfFetch(`${baseUrl}/api/cart`, { headers: { Cookie: cookieA } })).json()) as any);
    const savedAfterSave = ((await (await csrfFetch(`${baseUrl}/api/saved-items`, { headers: { Cookie: cookieA } })).json()) as any);

    if (cartAfterSave.data.items.length !== 0) {
      throw new Error(`Expected cart to be empty after saveForLater, found ${cartAfterSave.data.items.length} items`);
    }
    if (savedAfterSave.data.items.length !== 1) {
      throw new Error(`Expected 1 saved item, found ${savedAfterSave.data.items.length}`);
    }
    const savedItemId = savedAfterSave.data.items[0].id;
    console.log('✓ Item moved to saved-for-later: cart is empty and saved items has 1 entry.');

    // 5. Move item back to cart: saved items becomes empty, cart has 1 entry
    const moveBackRes = await csrfFetch(`${baseUrl}/api/saved-items/${savedItemId}/move-to-cart`, {
      method: 'POST',
      headers: { Cookie: cookieA },
    });
    if (moveBackRes.status !== 200) {
      throw new Error(`Failed to move back to cart: status ${moveBackRes.status}`);
    }

    const cartAfterMoveBack = ((await (await csrfFetch(`${baseUrl}/api/cart`, { headers: { Cookie: cookieA } })).json()) as any);
    const savedAfterMoveBack = ((await (await csrfFetch(`${baseUrl}/api/saved-items`, { headers: { Cookie: cookieA } })).json()) as any);

    if (savedAfterMoveBack.data.items.length !== 0) {
      throw new Error(`Expected saved items to be empty, found ${savedAfterMoveBack.data.items.length}`);
    }
    if (cartAfterMoveBack.data.items.length !== 1) {
      throw new Error(`Expected cart to have 1 item, found ${cartAfterMoveBack.data.items.length}`);
    }
    const cartItemId = cartAfterMoveBack.data.items[0].id;
    console.log('✓ Item moved back to cart: saved items empty, cart has 1 entry.');

    // 6. Quantity clamping: update quantity to product.stock + 100
    const clampQtyRes = await csrfFetch(`${baseUrl}/api/cart/items/${cartItemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ quantity: testProduct.stock + 100 }),
    });
    if (clampQtyRes.status !== 200) {
      throw new Error(`Failed to update quantity: status ${clampQtyRes.status}`);
    }
    const clampedItem = ((await clampQtyRes.json()) as any).data.item;
    if (clampedItem.quantity !== testProduct.stock) {
      throw new Error(`Expected quantity clamped to ${testProduct.stock}, got ${clampedItem.quantity}`);
    }
    console.log(`✓ Quantity clamped strictly to stock level (${testProduct.stock}).`);

    // 7. Isolation check: Customer B verifies cart is completely empty
    const cartBRes = ((await (await csrfFetch(`${baseUrl}/api/cart`, { headers: { Cookie: cookieB } })).json()) as any);
    if (cartBRes.data.items.length !== 0) {
      throw new Error(`Isolation failed: Customer B has ${cartBRes.data.items.length} items in cart!`);
    }
    console.log('✓ Cross-user isolation verified: Customer B cart is completely empty.');

    // 8. Guest merge check into Customer B cart
    const guestItems = [
      { productId: testProduct.id, quantity: 2, selectedColor: 'Blue', selectedSize: 'M' },
      { productId: testProduct.id, quantity: 1, selectedColor: 'Blue', selectedSize: 'M' }, // duplicate variant
    ];
    const mergeRes = await csrfFetch(`${baseUrl}/api/cart/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieB },
      body: JSON.stringify({ items: guestItems }),
    });
    if (mergeRes.status !== 200) {
      throw new Error(`Failed to merge guest cart: status ${mergeRes.status}`);
    }
    const mergedCart = ((await mergeRes.json()) as any).data.items;
    if (mergedCart.length !== 1) {
      throw new Error(`Expected exactly 1 merged line item for same variant, found ${mergedCart.length}`);
    }
    if (mergedCart[0].quantity !== 3) {
      throw new Error(`Expected combined quantity 3, found ${mergedCart[0].quantity}`);
    }
    console.log('✓ Guest cart merged cleanly into Customer B account with deduplication.');

    // 9. Wishlist toggle & isolation check
    const toggleWishlistRes = await csrfFetch(`${baseUrl}/api/wishlist/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ productId: testProduct.id }),
    });
    if (toggleWishlistRes.status !== 201) {
      throw new Error(`Failed to add to wishlist: status ${toggleWishlistRes.status}`);
    }
    const wishlistA = ((await (await csrfFetch(`${baseUrl}/api/wishlist`, { headers: { Cookie: cookieA } })).json()) as any);
    if (wishlistA.data.count !== 1) {
      throw new Error(`Expected Customer A wishlist count 1, got ${wishlistA.data.count}`);
    }
    const wishlistB = ((await (await csrfFetch(`${baseUrl}/api/wishlist`, { headers: { Cookie: cookieB } })).json()) as any);
    if (wishlistB.data.count !== 0) {
      throw new Error(`Expected Customer B wishlist count 0, got ${wishlistB.data.count}`);
    }
    console.log('✓ Wishlist functionality and isolation verified.');

    console.log('\n========================================');
    console.log(' ALL TASK 07 ACCEPTANCE CHECKS PASSED! ');
    console.log('========================================\n');
  } finally {
    // Cleanup
    await prisma.user.deleteMany({
      where: { email: { in: [customerAEmail, customerBEmail] } },
    });
    server.close();
  }
}

runCartTests().catch((err) => {
  console.error('Task 07 Verification Failed:', err);
  process.exit(1);
});
