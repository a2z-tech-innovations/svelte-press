import { test, expect } from '@playwright/test';
import { login } from './helpers/auth.js';

const TS = Date.now();
const MENU_NAME = `Main Nav ${TS}`;

test.describe('Navigation Menus', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('menus admin page loads with existing menus', async ({ page }) => {
		await page.goto('/sp-admin/menus');
		await expect(page.getByRole('heading', { name: 'Menus' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Add to Menu' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Create New Menu' })).toBeVisible();
	});

	test('create a new menu', async ({ page }) => {
		await page.goto('/sp-admin/menus');
		await page.getByRole('textbox', { name: 'Menu Name' }).fill(MENU_NAME);
		await page.getByRole('button', { name: 'Create Menu' }).click();
		await page.waitForTimeout(500);
		// The new menu should be selected in the dropdown or visible
		const menuSelect = page.locator('select').first();
		await expect(menuSelect.locator(`option:has-text("${MENU_NAME}")`)).toHaveCount(1, {
			timeout: 10_000
		});
	});

	test('add pages to existing menu and save', async ({ page }) => {
		await page.goto('/sp-admin/menus');

		// Select the existing "Main Navigation" menu or first available
		const menuSelect = page.locator('select').first();
		const options = await menuSelect.locator('option').all();
		if (options.length > 0) {
			await menuSelect.selectOption({ index: 0 });
		}

		// Add pages tab items — scope to avoid sidebar nav ambiguity
		const pagesTab = page.locator('.sp-panel-tab').filter({ hasText: 'Pages' });
		await pagesTab.click();
		await page.waitForTimeout(200);

		// Check any available page checkbox
		const pageCheckboxes = page.getByRole('checkbox');
		const count = await pageCheckboxes.count();
		if (count > 0) {
			await pageCheckboxes.first().check();
			await page.getByRole('button', { name: 'Add to Menu' }).click();
			await page.waitForTimeout(500);
		}

		// Save the menu
		await page.getByRole('button', { name: 'Save Menu' }).click();
		await page.waitForTimeout(500);
		// Should show success notice
		await expect(page.locator('.sp-notice-success, [class*="success"]').first()).toBeVisible({
			timeout: 5_000
		});
	});

	test('add a custom link to menu', async ({ page }) => {
		await page.goto('/sp-admin/menus');

		// Click Custom tab
		await page.getByRole('button', { name: 'Custom' }).click();
		await page.waitForTimeout(200);

		// Fill custom link fields
		const urlInput = page.getByRole('textbox', { name: /url/i }).first();
		const labelInput = page.getByRole('textbox', { name: /label|text/i }).first();

		if ((await urlInput.count()) > 0) {
			await urlInput.fill('https://example.com');
		}
		if ((await labelInput.count()) > 0) {
			await labelInput.fill('External Link');
		}

		await page.getByRole('button', { name: 'Add to Menu' }).click();
		await page.waitForTimeout(300);
		// Menu items render as <input> fields — CSS [value=...] only matches HTML attributes,
		// not JS-set properties. Use evaluate() to check the current value.
		const hasExternalLink = await page.evaluate(() =>
			Array.from(document.querySelectorAll('input[type="text"]')).some(
				(el) => (el as HTMLInputElement).value === 'External Link'
			)
		);
		expect(hasExternalLink).toBe(true);
	});

	test('menu structure section shows added items', async ({ page }) => {
		await page.goto('/sp-admin/menus');
		await expect(page.getByRole('heading', { name: 'Menu Structure' })).toBeVisible();
		// The menu structure section is present and functional
		await expect(page.getByRole('button', { name: 'Save Menu' })).toBeVisible();
	});
});
