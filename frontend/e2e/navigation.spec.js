import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display dashboard after login', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should show dashboard content', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to Projects page', async ({ page }) => {
    await page.locator('nav a[href="/projects"]').click();
    await expect(page).toHaveURL(/\/projects/);
  });

  test('should navigate to Vendors page', async ({ page }) => {
    await page.locator('nav a[href="/vendors"]').click();
    await expect(page).toHaveURL(/\/vendors/);
  });

  test('should navigate to Divisions page', async ({ page }) => {
    await page.locator('nav a[href="/divisions"]').click();
    await expect(page).toHaveURL(/\/divisions/);
  });

  test('should navigate to Budgets page', async ({ page }) => {
    await page.locator('nav a[href="/budgets"]').click();
    await expect(page).toHaveURL(/\/budgets/);
  });
});

test.describe('Divisions Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display divisions list page', async ({ page }) => {
    await page.goto('/divisions');
    await expect(page.getByRole('heading', { name: /divisions/i })).toBeVisible();
  });

  test('should navigate to division detail', async ({ page }) => {
    await page.goto('/divisions');
    const link = page.locator('a[href^="/divisions/"]').first();
    if (await link.isVisible()) {
      await link.click();
      await expect(page).toHaveURL(/\/divisions\/\d+/);
    }
  });
});

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display settings page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });
});
