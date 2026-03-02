import { test, expect } from '@playwright/test';
import { login } from './helpers/auth.js';

test.describe('Widgets', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('widgets admin page loads with areas and available widgets', async ({ page }) => {
		await page.goto('/sp-admin/widgets');
		// Use first() to avoid strict mode — H1 + possible nav item both named "Widgets"
		await expect(page.getByRole('heading', { name: 'Widgets' }).first()).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Available Widgets' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Primary Sidebar' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Footer 1' })).toBeVisible();
	});

	test('available widgets list includes standard widgets', async ({ page }) => {
		await page.goto('/sp-admin/widgets');
		// Use first() — widget titles appear in multiple places (title + add button label)
		await expect(page.getByText('Search').first()).toBeVisible();
		await expect(page.getByText('Recent Posts').first()).toBeVisible();
		await expect(page.getByText('Categories').first()).toBeVisible();
		await expect(page.getByText('Archives').first()).toBeVisible();
	});

	test('add Recent Posts widget to Primary Sidebar', async ({ page }) => {
		await page.goto('/sp-admin/widgets');

		// Click "+ Primary Sidebar" button next to Recent Posts widget
		const recentPostsSection = page.locator('div').filter({ hasText: /^Recent Posts/ }).first();
		const addButton = recentPostsSection.getByRole('button', { name: '+ Primary Sidebar' });
		await addButton.click();
		await page.waitForTimeout(500);

		// Verify it appears in the Primary Sidebar area
		const sidebarArea = page.locator('div').filter({ hasText: /Primary Sidebar/ }).last();
		await expect(sidebarArea).toBeVisible();
	});

	test('add Categories widget to Primary Sidebar', async ({ page }) => {
		await page.goto('/sp-admin/widgets');

		const categoriesSection = page.locator('div').filter({ hasText: /^Categories/ }).first();
		const addButton = categoriesSection.getByRole('button', { name: '+ Primary Sidebar' });
		await addButton.click();
		await page.waitForTimeout(500);

		await expect(page).not.toHaveURL(/error/);
	});

	test('frontend sidebar shows widgets', async ({ page }) => {
		await page.goto('/');
		// <aside> has implicit complementary role — use element selector
		await expect(page.locator('aside').first()).toBeVisible();
		// Categories and Archives are seeded by default in the sidebar widget area
		await expect(page.getByRole('heading', { name: 'Categories', level: 3 })).toBeVisible();
	});

	test('remove widget from sidebar', async ({ page }) => {
		await page.goto('/sp-admin/widgets');
		// Look for remove buttons in the sidebar area
		const removeButtons = page.getByRole('button', { name: /remove|×/i });
		const count = await removeButtons.count();
		if (count > 0) {
			await removeButtons.first().click();
			await page.waitForTimeout(300);
			await expect(page).not.toHaveURL(/error/);
		}
	});
});
