import { test, expect } from '@playwright/test';

test('password length validation', async ({ page }) => {
  await page.goto('http://localhost:5173/register');

  await page.fill('id=name', 'Test User');
  await page.fill('id=email', 'test@example.com');
  await page.fill('id=phone', '12345678');
  await page.fill('id=password', 'short');

  // Checkboxes
  const checkboxes = await page.$$('input[type="checkbox"]');
  await checkboxes[0].check();
  await checkboxes[1].check();

  await page.click('button[type="submit"]');

  // The custom error should be visible
  const error = page.locator('.bg-error-container');
  await expect(error).toBeVisible();
  await expect(error).toContainText('Passwort muss mindestens 8 Zeichen lang sein');
});
