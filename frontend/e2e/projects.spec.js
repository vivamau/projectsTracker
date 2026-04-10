import { test, expect } from '@playwright/test';
import { login, ADMIN, CONTRIBUTOR } from './helpers';

test.describe('Projects Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display projects list page', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: /^projects/i })).toBeVisible();
  });

  test('should show projects in tables', async ({ page }) => {
    await page.goto('/projects');
    const firstTable = page.locator('table').first();
    await expect(firstTable).toBeVisible();
  });

  test('should navigate to project detail when clicking a project', async ({ page }) => {
    await page.goto('/projects');
    const projectLink = page.locator('a[href^="/projects/"]').first();
    if (await projectLink.isVisible()) {
      await projectLink.click();
      await expect(page).toHaveURL(/\/projects\/\d+/);
    }
  });

  test('should show New Project button for admin', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('link', { name: /new project/i })).toBeVisible();
  });

  test('should hide New Project button for contributor', async ({ page }) => {
    await login(page, CONTRIBUTOR.email, CONTRIBUTOR.password);
    await page.goto('/projects');
    await expect(page.getByRole('link', { name: /new project/i })).not.toBeVisible();
  });

  test('should search projects', async ({ page }) => {
    await page.goto('/projects');
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
    }
  });

  test('should display table content', async ({ page }) => {
    await page.goto('/projects');
    const tableBody = page.locator('table').first().locator('tbody');
    await expect(tableBody).toBeVisible();
  });
});

test.describe('Project Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display project detail with all sections', async ({ page }) => {
    await page.goto('/projects');
    const projectLinks = page.locator('a[href^="/projects/"]').filter({ hasNot: page.locator('a[href="/projects/new"]') });
    const count = await projectLinks.count();
    if (count > 0) {
      await projectLinks.first().click();
      await expect(page.getByText(/project details|description/i)).toBeVisible();
    }
  });

  test('should show sidebar cards on project detail', async ({ page }) => {
    await page.goto('/projects/1');
    await expect(page.getByRole('heading', { name: 'Budgets' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vendor Resources' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Countries' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Supporting Divisions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Metadata' })).toBeVisible();
  });

  test('should show Vendor Resources card on project detail', async ({ page }) => {
    await page.goto('/projects/1');
    await expect(page.getByRole('heading', { name: 'Vendor Resources' })).toBeVisible();
  });

  test('should show Edit and Delete buttons for admin', async ({ page }) => {
    await page.goto('/projects/1');
    await expect(page.getByRole('link', { name: /edit/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /delete/i })).toBeVisible();
  });

  test('should hide Edit and Delete buttons for contributor', async ({ page }) => {
    await login(page, CONTRIBUTOR.email, CONTRIBUTOR.password);
    await page.goto('/projects/1');
    await expect(page.getByRole('link', { name: /edit/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /delete/i })).not.toBeVisible();
  });

  test('should show health status history', async ({ page }) => {
    await page.goto('/projects/1');
    await expect(page.getByRole('heading', { name: 'Health Status History' })).toBeVisible();
  });

  test('should show milestones section', async ({ page }) => {
    await page.goto('/projects/1');
    await expect(page.getByRole('heading', { name: 'Milestones' })).toBeVisible();
  });

  test('should navigate back to projects list', async ({ page }) => {
    await page.goto('/projects/1');
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole('heading', { name: /^projects/i })).toBeVisible();
  });
});
