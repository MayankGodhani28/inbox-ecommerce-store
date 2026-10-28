import { test, expect } from '@playwright/test';

test.describe('Print Invoice Feature — Real Browser Verification', () => {
  test('print mode hides website UI (navbar, footer, action buttons) and displays only the official tax invoice bill', async ({ page }) => {
    // Navigate directly to order-success with a sample orderId parameter
    await page.goto('http://localhost:3000/?tab=order-success&orderId=ord-demo-print');

    // In regular screen mode, the navbar is visible
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Emulate print media (simulates browser Ctrl+P or window.print())
    await page.emulateMedia({ media: 'print' });

    // In print mode, header (Navbar) must be hidden
    await expect(header).toBeHidden();

    // In print mode, footer must be hidden
    const footer = page.locator('footer');
    await expect(footer).toBeHidden();

    // In print mode, all buttons should be hidden
    const printButtons = page.locator('button');
    const buttonCount = await printButtons.count();
    for (let i = 0; i < buttonCount; i++) {
      await expect(printButtons.nth(i)).toBeHidden();
    }
  });
});
