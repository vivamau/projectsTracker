import { test, expect } from '@playwright/test';
import { login, ADMIN, CONTRIBUTOR } from './helpers';

test.describe('Vendors Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display vendors list page', async ({ page }) => {
    await page.goto('/vendors');
    await expect(page.getByRole('heading', { name: /vendors/i })).toBeVisible();
  });

  test('should show vendors in a table', async ({ page }) => {
    await page.goto('/vendors');
    const table = page.locator('table').first();
    await expect(table).toBeVisible();
  });

  test('should show New Vendor button for admin', async ({ page }) => {
    await page.goto('/vendors');
    await expect(page.getByRole('button', { name: /new vendor/i })).toBeVisible();
  });

  test('should hide New Vendor button for contributor', async ({ page }) => {
    await login(page, CONTRIBUTOR.email, CONTRIBUTOR.password);
    await page.goto('/vendors');
    await expect(page.getByRole('button', { name: /new vendor/i })).not.toBeVisible();
  });

  test('should navigate to vendor detail when clicking a vendor', async ({ page }) => {
    await page.goto('/vendors');
    const vendorLink = page.locator('a[href^="/vendors/"]').first();
    if (await vendorLink.isVisible()) {
      await vendorLink.click();
      await expect(page).toHaveURL(/\/vendors\/\d+/);
    }
  });
});

test.describe('Vendor Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display vendor detail with resources', async ({ page }) => {
    await page.goto('/vendors');
    const vendorLink = page.locator('a[href^="/vendors/"]').first();
    if (await vendorLink.isVisible()) {
      await vendorLink.click();
      await expect(page.locator('body')).toContainText(/vendor/i);
    }
  });
});
