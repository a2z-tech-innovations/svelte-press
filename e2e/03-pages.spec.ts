import { test, expect } from '@playwright/test';
import { login } from './helpers/auth.js';

const TS = Date.now();
const PAGE1_TITLE = `About Us ${TS}`;
const PAGE2_TITLE = `Contact ${TS}`;

test.describe('Pages', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('create and publish Page 1 (About Us)', async ({ page }) => {
		await page.goto('/sp-admin/pages/new');
		await page.getByRole('textbox', { name: 'Add title' }).fill(PAGE1_TITLE);
		const editor = page.locator('.ProseMirror');
		await editor.click();
		await page.keyboard.type('We are a company dedicated to building great software.');
		await page.getByRole('button', { name: 'Publish' }).click();
		await page.waitForURL(/sp-admin\/pages/);
	});

	test('create and publish Page 2 (Contact)', async ({ page }) => {
		await page.goto('/sp-admin/pages/new');
		await page.getByRole('textbox', { name: 'Add title' }).fill(PAGE2_TITLE);
		const editor = page.locator('.ProseMirror');
		await editor.click();
		await page.keyboard.type('Get in touch with us via email or phone.');
		await page.getByRole('button', { name: 'Publish' }).click();
		await page.waitForURL(/sp-admin\/pages/);
	});

	test('published page is accessible on frontend', async ({ page }) => {
		const slug = PAGE1_TITLE.toLowerCase().replace(/\s+/g, '-');
		await page.goto(`/${slug}/`);
		await expect(page.getByRole('heading', { name: PAGE1_TITLE, level: 1 })).toBeVisible();
		await expect(
			page.getByText('We are a company dedicated to building great software.')
		).toBeVisible();
	});

	test('pages do NOT appear in the blog post listing', async ({ page }) => {
		await page.goto('/');
		// Pages should not appear as articles in the blog listing
		// The home page shows only posts (postType='post'), not pages
		const articles = page.locator('article');
		const count = await articles.count();
		for (let i = 0; i < count; i++) {
			const text = await articles.nth(i).textContent();
			// Page titles shouldn't be here since frontend home only shows posts
			expect(text).not.toContain(`About Us ${TS}`);
			expect(text).not.toContain(`Contact ${TS}`);
		}
	});

	test('pages list shows created pages in admin', async ({ page }) => {
		await page.goto('/sp-admin/pages');
		await expect(page.getByRole('link', { name: PAGE1_TITLE })).toBeVisible();
		await expect(page.getByRole('link', { name: PAGE2_TITLE })).toBeVisible();
	});
});
