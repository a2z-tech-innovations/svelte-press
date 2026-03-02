import { test, expect } from '@playwright/test';
import { login, logout } from './helpers/auth.js';

test.describe('Admin Authentication & Session', () => {
	test('wrong password shows error message', async ({ page }) => {
		await page.goto('/sp-login');
		await page.getByRole('textbox', { name: 'Username' }).fill('admin');
		await page.getByRole('textbox', { name: 'Password' }).fill('wrongpassword');
		await page.getByRole('button', { name: 'Sign In' }).click();
		await expect(page.getByText('Invalid username or password.')).toBeVisible();
		await expect(page).toHaveURL(/sp-login/);
	});

	test('login with valid credentials redirects to dashboard', async ({ page }) => {
		await login(page);
		await expect(page).toHaveURL(/sp-admin\/dashboard/);
		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
	});

	test('dashboard loads welcome panel, stats, and activity', async ({ page }) => {
		await login(page);
		await expect(page.getByRole('heading', { name: 'Welcome to SveltePress!' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'At a Glance' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Quick Draft' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Recent Activity' })).toBeVisible();
	});

	test('session persists in a new browser context tab', async ({ browser }) => {
		const context = await browser.newContext();
		const page1 = await context.newPage();
		await login(page1);

		// Open second page in same context (shared cookies)
		const page2 = await context.newPage();
		await page2.goto('/sp-admin/dashboard');
		await expect(page2.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

		await context.close();
	});

	test('logout redirects to login page', async ({ page }) => {
		await login(page);
		await logout(page);
		await expect(page).toHaveURL(/sp-login/);
		await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
	});

	test('accessing admin after logout redirects to login', async ({ page }) => {
		await login(page);
		await logout(page);
		await page.goto('/sp-admin/dashboard');
		await expect(page).toHaveURL(/sp-login/);
	});

	test('profile page shows admin details', async ({ page }) => {
		await login(page);
		await page.goto('/sp-admin/profile');
		await expect(page.getByRole('heading', { name: 'Your Profile' })).toBeVisible();
		await expect(page.getByRole('textbox', { name: /username/i })).toHaveValue('admin');
	});
});
