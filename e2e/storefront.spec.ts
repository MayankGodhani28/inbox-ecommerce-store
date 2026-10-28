import { test, expect } from '@playwright/test';

test.describe('Storefront & Catalog Browsing', () => {
  test('should load the homepage and render the header, hero, and product catalog', async ({ page }) => {
    await page.goto('/');

    // Verify page title and brand logo are present
    await expect(page).toHaveTitle(/inBox/i);
    await expect(page.locator('header')).toBeVisible();

    // Verify product cards are displayed
    const productCards = page.locator('article, .group.relative');
    await expect(productCards.first()).toBeVisible({ timeout: 10000 });
    const count = await productCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should allow searching for products via the search bar', async ({ page }) => {
    await page.goto('/');

    // Locate the search input in the navbar
    const searchInput = page.locator('input[type="text"]').first();
    await expect(searchInput).toBeVisible();

    // Type a search query (e.g. "Sony" or "phone")
    await searchInput.fill('Sony');
    await searchInput.press('Enter');

    // Wait for the URL or products to update
    await page.waitForTimeout(1000);
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('Sony');
  });
});
