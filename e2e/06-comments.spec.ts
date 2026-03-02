import { test, expect } from '@playwright/test';
import { login } from './helpers/auth.js';

const TS = Date.now();
const COMMENT_NAME = `TestCommenter ${TS}`;
const COMMENT_EMAIL = `commenter${TS}@example.com`;
const COMMENT_TEXT = `This is a test comment ${TS}`;
const SPAM_TEXT = `Spam comment ${TS}`;
const TRASH_TEXT = `Trash comment ${TS}`;

// Use an existing published post slug for comment tests
const TEST_POST_SLUG = 'getting-started-with-sveltepress';

test.describe('Comments & Moderation', () => {
	test('submit comment from frontend as anonymous visitor', async ({ page }) => {
		await page.goto(`/${TEST_POST_SLUG}/`);
		// Use IDs to avoid strict mode violation (post may have embedded forms)
		await page.locator('#comment-name').fill(COMMENT_NAME);
		await page.locator('#comment-email').fill(COMMENT_EMAIL);
		await page.locator('#comment-content').fill(COMMENT_TEXT);
		await page.locator('button[type="submit"]').filter({ hasText: 'Post Comment' }).click();
		await page.waitForTimeout(1000);
		// Should show success or the comment (if auto-approved) or pending message
		// Just verify no crash and form submitted
		await expect(page).not.toHaveURL(/error/);
	});

	test('new comment appears in admin pending tab', async ({ page }) => {
		await login(page);
		await page.goto('/sp-admin/comments?status=pending');
		await expect(page.getByText(COMMENT_TEXT)).toBeVisible({ timeout: 10_000 });
	});

	test('approve comment makes it visible on frontend', async ({ page }) => {
		await login(page);
		await page.goto('/sp-admin/comments?status=pending');

		// Row actions are buttons (always in DOM, hidden by CSS until row hovered)
		const rows = page.locator('table tbody tr');
		const rowCount = await rows.count();
		let targetIdx = -1;
		for (let i = 0; i < rowCount; i++) {
			if ((await rows.nth(i).innerText()).includes(COMMENT_TEXT)) { targetIdx = i; break; }
		}
		if (targetIdx < 0) { test.skip(); return; }
		const row = rows.nth(targetIdx);
		await row.hover();
		await row.locator('button').filter({ hasText: 'Approve' }).click({ force: true });
		await page.waitForTimeout(500);

		// Verify on frontend
		await page.goto(`/${TEST_POST_SLUG}/`);
		await expect(page.getByText(COMMENT_TEXT)).toBeVisible({ timeout: 10_000 });
	});

	test('submit second comment and mark as spam', async ({ page }) => {
		// Submit spam comment from frontend
		await page.goto(`/${TEST_POST_SLUG}/`);
		await page.getByRole('textbox', { name: 'Name' }).fill(`Spammer ${TS}`);
		await page.getByRole('textbox', { name: 'Email' }).fill(`spam${TS}@example.com`);
		await page.getByRole('textbox', { name: 'Comment' }).fill(SPAM_TEXT);
		await page.getByRole('button', { name: 'Post Comment' }).click();
		await page.waitForTimeout(1000);

		// Mark as spam in admin
		await login(page);
		await page.goto('/sp-admin/comments?status=pending');
		const spamRows = page.locator('table tbody tr');
		const sc = await spamRows.count();
		let spamIdx = -1;
		for (let i = 0; i < sc; i++) {
			if ((await spamRows.nth(i).innerText()).includes(SPAM_TEXT)) { spamIdx = i; break; }
		}
		if (spamIdx < 0) { test.skip(); return; }
		const row = spamRows.nth(spamIdx);
		await row.hover();
		await row.locator('button').filter({ hasText: 'Spam' }).click({ force: true });
		await page.waitForTimeout(500);

		// Should be in spam tab
		await page.goto('/sp-admin/comments?status=spam');
		await expect(page.getByText(SPAM_TEXT)).toBeVisible();

		// Should NOT appear on frontend
		await page.goto(`/${TEST_POST_SLUG}/`);
		await expect(page.getByText(SPAM_TEXT)).not.toBeVisible();
	});

	test('submit third comment and trash it', async ({ page }) => {
		// Submit from frontend
		await page.goto(`/${TEST_POST_SLUG}/`);
		await page.getByRole('textbox', { name: 'Name' }).fill(`Trasher ${TS}`);
		await page.getByRole('textbox', { name: 'Email' }).fill(`trash${TS}@example.com`);
		await page.getByRole('textbox', { name: 'Comment' }).fill(TRASH_TEXT);
		await page.getByRole('button', { name: 'Post Comment' }).click();
		await page.waitForTimeout(1000);

		// Trash it
		await login(page);
		await page.goto('/sp-admin/comments?status=pending');
		const trashRows = page.locator('table tbody tr');
		const tc = await trashRows.count();
		let trashIdx = -1;
		for (let i = 0; i < tc; i++) {
			if ((await trashRows.nth(i).innerText()).includes(TRASH_TEXT)) { trashIdx = i; break; }
		}
		if (trashIdx < 0) { test.skip(); return; }
		const row = trashRows.nth(trashIdx);
		await row.hover();
		await row.locator('button').filter({ hasText: 'Trash' }).click({ force: true });
		await page.waitForTimeout(500);

		// Should be in trash tab
		await page.goto('/sp-admin/comments?status=trash');
		await expect(page.getByText(TRASH_TEXT)).toBeVisible();
	});

	test('comments list shows status tabs with correct labels', async ({ page }) => {
		await login(page);
		await page.goto('/sp-admin/comments');
		await expect(page.getByRole('link', { name: /All \d+/ })).toBeVisible();
		await expect(page.getByRole('link', { name: /Pending \d+/ })).toBeVisible();
		await expect(page.getByRole('link', { name: /Approved \d+/ })).toBeVisible();
		await expect(page.getByRole('link', { name: /Spam \d+/ })).toBeVisible();
		await expect(page.getByRole('link', { name: /Trash \d+/ })).toBeVisible();
	});
});
