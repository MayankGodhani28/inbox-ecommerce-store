import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const timestamp = Date.now();
  const testUser = {
    name: 'Playwright Tester',
    email: `pw_tester_${timestamp}@inbox.com`,
    password: 'SecurePassword123!',
  };

  test('should allow a shopper to create an account and authenticate', async ({ page }) => {
    // Navigate directly to the login tab
    await page.goto('/?tab=login');

    // Switch to "Create Account" tab
    const createAccountTab = page.locator('button', { hasText: 'Create Account' });
    await expect(createAccountTab).toBeVisible({ timeout: 10000 });
    await createAccountTab.click();

    // Fill registration form
    const emailInput = page.getByPlaceholder('you@example.com');
    const registrationForm = page.locator('form').filter({ has: emailInput });

    await page.getByPlaceholder('e.g. Mayank Godhani').fill(testUser.name);
    await emailInput.fill(testUser.email);
    await registrationForm.locator('input[type="password"]').fill(testUser.password);

    // Submit registration
    await registrationForm.locator('button[type="submit"]').click();

    // Wait for authentication and redirect back to storefront
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Sign in to your account');
  });
});
