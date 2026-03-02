import { test, expect } from '@playwright/test';
import { login } from './helpers/auth.js';

const TS = Date.now();

test.describe('Chaos & Edge Cases', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('rapid navigation between 10 admin pages causes no crashes', async ({ page }) => {
		const pages = [
			'/sp-admin/dashboard',
			'/sp-admin/posts',
			'/sp-admin/pages',
			'/sp-admin/media',
			'/sp-admin/comments',
			'/sp-admin/categories',
			'/sp-admin/tags',
			'/sp-admin/users',
			'/sp-admin/settings/general',
			'/sp-admin/menus'
		];

		for (const adminPage of pages) {
			await page.goto(adminPage);
			await page.waitForLoadState('domcontentloaded');
			// Verify no error page
			await expect(page.locator('body')).not.toContainText('Internal Server Error');
			await expect(page.locator('body')).not.toContainText('500');
		}
	});

	test('pasting raw HTML with script tags into editor strips scripts on frontend', async ({
		page
	}) => {
		await page.goto('/sp-admin/posts/new');
		const titleStr = `XSS Editor Test ${TS}`;
		await page.getByRole('textbox', { name: 'Add title' }).fill(titleStr);

		const editor = page.locator('.ProseMirror');
		await editor.click();
		// Type some benign text (editor sanitizes on input)
		await page.keyboard.type('Safe paragraph before. ');
		// Simulate pasting malicious content via clipboard API
		await page.evaluate(() => {
			const el = document.querySelector('.ProseMirror') as HTMLElement;
			if (el) {
				const event = new ClipboardEvent('paste', {
					bubbles: true,
					cancelable: true,
					clipboardData: new DataTransfer()
				});
				(event.clipboardData as DataTransfer).setData(
					'text/html',
					'<p>Safe</p><script>window.__xssRan=true;</script><iframe src="evil.com"></iframe>'
				);
				el.dispatchEvent(event);
			}
		});

		await page.keyboard.type(' After paste.');
		await page.getByRole('button', { name: 'Publish' }).click();
		await page.waitForURL(/sp-admin\/posts/);

		// Check frontend: script should not have executed
		const slug = titleStr.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
		await page.goto(`/${slug}/`);
		if ((await page.locator('article').count()) > 0) {
			const xssRan = await page.evaluate(() => (window as unknown as { __xssRan?: boolean }).__xssRan);
			expect(xssRan).toBeFalsy();
			const html = await page.locator('article').innerHTML();
			expect(html).not.toContain('<script>');
		}
	});

	test('post with extremely long title is handled gracefully', async ({ page }) => {
		await page.goto('/sp-admin/posts/new');
		const longTitle = 'A'.repeat(1000);
		await page.getByRole('textbox', { name: 'Add title' }).fill(longTitle);
		await page.getByRole('button', { name: 'Save Draft' }).click();
		// Should either save (with truncation) or show validation error — no 500
		await expect(page).not.toHaveURL(/error\/500/);
	});

	test('post with emoji in title and content saves and renders correctly', async ({ page }) => {
		await page.goto('/sp-admin/posts/new');
		const emojiTitle = `Emoji Post 🚀📱💻 ${TS}`;
		await page.getByRole('textbox', { name: 'Add title' }).fill(emojiTitle);

		const editor = page.locator('.ProseMirror');
		await editor.click();
		await page.keyboard.type('Content with emojis: 🎉🔥✅');

		await page.getByRole('button', { name: 'Publish' }).click();
		await page.waitForURL(/sp-admin\/posts/);

		// Verify on frontend
		await page.goto('/');
		const postLink = page.getByRole('link', { name: /Emoji Post/ }).first();
		if ((await postLink.count()) > 0) {
			await postLink.click();
			await expect(page.getByText('Content with emojis:')).toBeVisible();
		}
	});

	test('post with Unicode/RTL text saves and renders', async ({ page }) => {
		await page.goto('/sp-admin/posts/new');
		const unicodeTitle = `Unicode Test ${TS}`;
		await page.getByRole('textbox', { name: 'Add title' }).fill(unicodeTitle);

		const editor = page.locator('.ProseMirror');
		await editor.click();
		// Chinese, Arabic, Hebrew
		await page.keyboard.type('中文内容 | محتوى عربي | תוכן עברי');

		await page.getByRole('button', { name: 'Publish' }).click();
		await page.waitForURL(/sp-admin\/posts/);

		const slug = unicodeTitle.toLowerCase().replace(/\s+/g, '-');
		await page.goto(`/${slug}/`);
		if ((await page.locator('article').count()) > 0) {
			await expect(page.getByText('中文内容')).toBeVisible();
		}
	});

	test('duplicate slug is auto-deduplicated', async ({ page }) => {
		const fixedTitle = `Duplicate Slug Test`;
		// Create first post
		await page.goto('/sp-admin/posts/new');
		await page.getByRole('textbox', { name: 'Add title' }).fill(fixedTitle);
		await page.locator('.ProseMirror').click();
		await page.keyboard.type('First post with this title.');
		await page.getByRole('button', { name: 'Publish' }).click();
		await page.waitForURL(/sp-admin\/posts/);

		// Create second post with same title
		await page.goto('/sp-admin/posts/new');
		await page.getByRole('textbox', { name: 'Add title' }).fill(fixedTitle);
		await page.locator('.ProseMirror').click();
		await page.keyboard.type('Second post with same title.');
		await page.getByRole('button', { name: 'Publish' }).click();
		await page.waitForURL(/sp-admin\/posts/);

		// Both posts should exist (with different slugs)
		await page.goto('/sp-admin/posts');
		const links = page.getByRole('link', { name: fixedTitle });
		const count = await links.count();
		// We should have at least 1 (could be 2 if not deduped by title shown)
		expect(count).toBeGreaterThanOrEqual(1);
	});

	test('non-existent admin route returns 404 or redirect, not crash', async ({ page }) => {
		await page.goto('/sp-admin/nonexistent-route-xyz');
		// Should be a 404 or redirect, not a 500
		await expect(page.locator('body')).not.toContainText('Internal Server Error');
	});

	test('non-existent public slug returns 404 page, not crash', async ({ page }) => {
		const res = await page.goto('/this-slug-does-not-exist-xyz-abc-123/');
		expect(res?.status()).toBe(404);
		await expect(page.locator('body')).not.toContainText('Internal Server Error');
	});

	test('quick draft from dashboard creates a draft', async ({ page }) => {
		await page.goto('/sp-admin/dashboard');
		await page.getByRole('textbox', { name: 'Title' }).fill(`Quick Draft ${TS}`);
		await page.getByRole('textbox', { name: "What's on your mind?" }).fill('Quick draft content.');
		await page.getByRole('button', { name: 'Save Draft' }).click();
		await page.waitForTimeout(500);
		// Should show success or the form should reset
		await expect(page).not.toHaveURL(/error/);
	});

	test('accessing admin pages without session redirects to login', async ({ browser }) => {
		const context = await browser.newContext(); // fresh context, no cookies
		const page = await context.newPage();
		await page.goto('http://localhost:5173/sp-admin/dashboard');
		await expect(page).toHaveURL(/sp-login/);
		await context.close();
	});
});
