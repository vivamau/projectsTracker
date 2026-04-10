import { test, expect } from '@playwright/test';
import { login, ADMIN, CONTRIBUTOR, SUPERADMIN, GUEST } from './helpers';

test.describe('Authentication', () => {
  test('should show login page for unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login');
    await expect(page.getByText('Sign in to your account')).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should login successfully with admin credentials', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should login successfully with superadmin credentials', async ({ page }) => {
    await login(page, SUPERADMIN.email, SUPERADMIN.password);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should login successfully with contributor credentials', async ({ page }) => {
    await login(page, CONTRIBUTOR.email, CONTRIBUTOR.password);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('wrong@test.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|failed|error/i)).toBeVisible();
  });

  test('should show error for empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to dashboard if already authenticated', async ({ page }) => {
    await login(page);
    await page.goto('/login');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should logout successfully', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await page.locator('header [ref="menuRef"], header button').last().click();
    const signOutBtn = page.getByText('Sign Out');
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();
    } else {
      await page.locator('header button').last().click();
      await page.waitForTimeout(500);
      await page.getByText('Sign Out').click();
    }
    await page.waitForURL('**/login', { timeout: 10000 }).catch(() => {});
    await expect(page).toHaveURL(/\/login/);
  });
});
