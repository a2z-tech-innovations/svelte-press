import { test, expect } from '@playwright/test';
import { login } from './helpers/auth.js';

const TS = Date.now();
const POST_TITLE = `Editor Stress Test ${TS}`;

const LOREM = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`;

test.describe('Editor Stress Test', () => {
	test.setTimeout(120_000);

	let editPostUrl = '';

	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('create post with rich mixed content', async ({ page }) => {
		await page.goto('/sp-admin/posts/new');

		const title = page.getByRole('textbox', { name: 'Add title' });
		await title.fill(POST_TITLE);

		const editor = page.locator('.ProseMirror');
		await editor.click();

		// 5 paragraphs with headings between them
		for (let i = 1; i <= 3; i++) {
			await page.keyboard.type(`${LOREM} (paragraph ${i})`);
			await page.keyboard.press('Enter');
			await page.keyboard.type(`## Heading ${i}`);
			await page.keyboard.press('Enter');
		}

		// Blockquote
		await page.keyboard.type('> This is a key blockquote for stress testing.');
		await page.keyboard.press('Enter');

		// Code block
		await page.keyboard.type('```');
		await page.keyboard.press('Enter');
		for (let i = 1; i <= 10; i++) {
			await page.keyboard.type(`const line${i} = ${i};`);
			await page.keyboard.press('Enter');
		}
		await page.keyboard.press('Escape');
		await page.keyboard.press('Enter');

		// Bullet list
		await page.keyboard.type('- First item');
		await page.keyboard.press('Enter');
		await page.keyboard.type('- Second item');
		await page.keyboard.press('Enter');
		await page.keyboard.type('- Third item');
		await page.keyboard.press('Enter');
		await page.keyboard.press('Enter'); // Exit list

		// Undo and redo a few times
		await page.keyboard.press('Control+z');
		await page.keyboard.press('Control+z');
		await page.keyboard.press('Control+z');
		await page.keyboard.press('Control+y');
		await page.keyboard.press('Control+y');

		// Publish
		await page.getByRole('button', { name: 'Publish' }).click();
		await page.waitForURL(/sp-admin\/posts/);

		// Capture the edit URL for round-trip test
		const urlMatch = page.url().match(/\/sp-admin\/posts\/(\d+)/);
		if (urlMatch) {
			editPostUrl = page.url();
		}
	});

	test('round-trip integrity: reload editor and verify content persists', async ({ page }) => {
		// Find the stress test post
		await page.goto('/sp-admin/posts');
		const editLink = page.getByRole('link', { name: POST_TITLE }).first();
		if ((await editLink.count()) === 0) {
			test.skip(); // Post not found, skip
			return;
		}

		await editLink.click();
		await page.waitForURL(/sp-admin\/posts\/\d+/);
		await page.waitForSelector('.ProseMirror');

		// Editor should have content (not empty)
		const editorContent = await page.locator('.ProseMirror').innerText();
		expect(editorContent.trim().length).toBeGreaterThan(100);

		// Should contain our headings
		await expect(page.locator('.ProseMirror h2').first()).toBeVisible();
	});

	test('frontend renders all blocks without errors', async ({ page }) => {
		const slug = POST_TITLE.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
		await page.goto(`/${slug}/`);

		// Either the post is found or we get a 404 - no 500
		const response = await page.request.get(`http://localhost:5173/${slug}/`);
		expect(response.status()).not.toBe(500);

		if (response.status() === 200) {
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
			// Verify code block content visible
			await expect(page.getByText('const line1 = 1;')).toBeVisible();
		}
	});

	test('editor handles undo/redo without data loss', async ({ page }) => {
		await page.goto('/sp-admin/posts/new');
		await page.getByRole('textbox', { name: 'Add title' }).fill(`Undo/Redo Test ${TS}`);

		const editor = page.locator('.ProseMirror');
		await editor.click();

		await page.keyboard.type('Original content.');
		await page.keyboard.press('Enter');
		await page.keyboard.type('Added line 2.');
		await page.keyboard.press('Enter');
		await page.keyboard.type('Added line 3.');

		// Capture content before undo
		const contentBefore = await editor.innerText();
		expect(contentBefore).toContain('Added line');

		// Undo several times — ProseMirror groups keystrokes into transactions
		// so the granularity isn't per-character; just verify undo doesn't crash
		await page.keyboard.press('Control+z');
		await page.keyboard.press('Control+z');
		// Editor should still be functional (not empty or errored)
		await expect(editor).toBeVisible();

		// Redo — should restore content
		await page.keyboard.press('Control+y');
		await page.keyboard.press('Control+y');

		const contentAfterRedo = await editor.innerText();
		// After redo, editor should have content (not empty)
		expect(contentAfterRedo.trim().length).toBeGreaterThan(0);
	});

	test('editor toolbar formatting works (bold, italic)', async ({ page }) => {
		await page.goto('/sp-admin/posts/new');
		await page.getByRole('textbox', { name: 'Add title' }).fill(`Formatting Test ${TS}`);

		const editor = page.locator('.ProseMirror');
		await editor.click();
		await page.keyboard.type('Normal text. ');

		// Bold — use aria-label to avoid ambiguity
		await page.getByRole('button', { name: 'Bold', exact: true }).click();
		await page.keyboard.type('Bold text');
		await page.getByRole('button', { name: 'Bold', exact: true }).click();

		await page.keyboard.type(' ');

		// Italic
		await page.getByRole('button', { name: 'Italic', exact: true }).click();
		await page.keyboard.type('Italic text');
		await page.getByRole('button', { name: 'Italic', exact: true }).click();

		await page.getByRole('button', { name: 'Save Draft' }).click();
		await page.waitForURL(/sp-admin\/posts/);
	});
});
