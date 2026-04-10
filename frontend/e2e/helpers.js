import { request } from '@playwright/test';

const BASE_URL = 'http://localhost:5003';

export async function login(page, email = 'admin@projecttracker.it', password = 'adminpassword') {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.waitForURL('**/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

export async function apiLogin(email = 'admin@projecttracker.it', password = 'adminpassword') {
  const context = await request.newContext({ baseURL: BASE_URL });
  const res = await context.post('/api/auth/login', { data: { email, password } });
  const setCookieHeader = res.headers()['set-cookie'];
  const cookie = setCookieHeader?.split(';')[0] || '';
  await context.dispose();
  return cookie;
}

export const ADMIN = { email: 'admin@projecttracker.it', password: 'adminpassword' };
export const CONTRIBUTOR = { email: 'contributor@projecttracker.it', password: 'contributorpassword' };
export const GUEST = { email: 'guest@projecttracker.it', password: 'guestpassword' };
export const SUPERADMIN = { email: 'superadmin@projecttracker.it', password: 'superadminpassword' };
