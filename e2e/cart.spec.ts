import { test, expect } from '@playwright/test';

test.describe('Shopping Cart Flow', () => {
  test('should add an item to the cart and reflect in cart count', async ({ page }) => {
    await page.goto('/');

    // Wait for products to load
    await page.waitForSelector('button[aria-label*="Add to Cart"], button[aria-label*="cart"]', { timeout: 10000 });

    // Locate the first Add to Cart button
    const addToCartButton = page.locator('button[aria-label*="Add to Cart"], button[aria-label*="cart"]').first();
    await expect(addToCartButton).toBeVisible();

    // Click "Add to Cart"
    await addToCartButton.click();

    // Verify cart badge increments (shows '1' or greater)
    const cartButton = page.locator('button[aria-label*="Cart"], button[title*="Cart"]').first();
    await expect(cartButton).toBeVisible();

    // The cart button should have a counter badge
    const badge = cartButton.locator('span').first();
    await expect(badge).toBeVisible();
    const badgeText = await badge.innerText();
    expect(parseInt(badgeText, 10)).toBeGreaterThanOrEqual(1);
  });
});
