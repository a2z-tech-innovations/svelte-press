import { test, expect } from '@playwright/test';
import { login } from './helpers/auth.js';

const ORIGINAL_TITLE = 'SveltePress';
const TEST_TITLE = 'My Test Site';

test.describe('Settings', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('general settings page loads all fields', async ({ page }) => {
		await page.goto('/sp-admin/settings/general');
		await expect(page.getByRole('heading', { name: 'General Settings' })).toBeVisible();
		await expect(page.getByRole('textbox', { name: 'Site Title' })).toBeVisible();
		await expect(page.getByRole('textbox', { name: 'Tagline' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();
	});

	test('change site title and verify it persists', async ({ page }) => {
		await page.goto('/sp-admin/settings/general');
		const titleInput = page.getByRole('textbox', { name: 'Site Title' });
		await titleInput.fill(TEST_TITLE);
		await page.getByRole('button', { name: 'Save Changes' }).click();
		await page.waitForTimeout(500);

		// Reload and verify persistence
		await page.reload();
		await expect(page.getByRole('textbox', { name: 'Site Title' })).toHaveValue(TEST_TITLE);
	});

	test('changed site title appears on frontend', async ({ page }) => {
		await page.goto('/');
		const title = await page.title();
		// Title should contain the new site name
		expect(title).toContain(TEST_TITLE);
	});

	test('restore original site title', async ({ page }) => {
		await page.goto('/sp-admin/settings/general');
		await page.getByRole('textbox', { name: 'Site Title' }).fill(ORIGINAL_TITLE);
		await page.getByRole('button', { name: 'Save Changes' }).click();
		await page.waitForTimeout(500);
		await page.reload();
		await expect(page.getByRole('textbox', { name: 'Site Title' })).toHaveValue(ORIGINAL_TITLE);
	});

	test('reading settings — change and restore posts per page', async ({ page }) => {
		await page.goto('/sp-admin/settings/reading');
		await expect(page.getByRole('heading', { name: 'Reading Settings' })).toBeVisible();

		// Change posts per page to 1
		const pppInput = page.locator('#posts_per_page');
		if ((await pppInput.count()) > 0) {
			await pppInput.fill('1');
			await page.getByRole('button', { name: 'Save Changes' }).click();
			await page.waitForTimeout(500);

			// Verify on frontend - should only show 1 post
			await page.goto('/');
			const articles = page.locator('article');
			await expect(articles).toHaveCount(1, { timeout: 10_000 });

			// Restore to 10
			await page.goto('/sp-admin/settings/reading');
			await page.locator('#posts_per_page').fill('10');
			await page.getByRole('button', { name: 'Save Changes' }).click();
			await page.waitForTimeout(500);
		}
	});

	test('permalink settings page loads', async ({ page }) => {
		await page.goto('/sp-admin/settings/permalinks');
		await expect(page.getByRole('heading', { name: 'Permalink Settings' })).toBeVisible();
	});

	test('discussion settings page loads', async ({ page }) => {
		await page.goto('/sp-admin/settings/discussion');
		await expect(page.getByRole('heading', { name: 'Discussion Settings' })).toBeVisible();
	});

	test('writing settings page loads', async ({ page }) => {
		await page.goto('/sp-admin/settings/writing');
		await expect(page.getByRole('heading', { name: 'Writing Settings' })).toBeVisible();
	});

	test('media settings page loads', async ({ page }) => {
		await page.goto('/sp-admin/settings/media');
		await expect(page.getByRole('heading', { name: 'Media Settings' })).toBeVisible();
	});
});
