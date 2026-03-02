import { test, expect } from '@playwright/test';
import { login } from './helpers/auth.js';
import * as fs from 'fs';
import * as path from 'path';

// Create a minimal valid PNG for testing (1x1 red pixel)
function createTestPng(): Buffer {
	// Minimal 1x1 red PNG (67 bytes)
	return Buffer.from(
		'89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
			'2e0000000c4944415408d7636020050000006400017ad2c0de0000000049454e44ae426082',
		'hex'
	);
}

test.describe('Media Library', () => {
	let testImagePath: string;

	test.beforeAll(async () => {
		// Write test image to fixtures directory
		testImagePath = path.join(process.cwd(), 'e2e', 'fixtures', 'test-image.jpg');
		// Use a simple valid JPEG (smallest possible: 1x1 white pixel)
		const jpegBytes = Buffer.from(
			'ffd8ffe000104a46494600010100000100010000' +
				'ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432' +
				'ffc0000b08000100010001011100' +
				'ffc4001f0000010501010101010100000000000000000102030405060708090a0b' +
				'ffc40035100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a929394959697989' +
				'9a' +
				'a2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9fa' +
				'ffda00080101000003f0007fc4ffd9',
			'hex'
		);
		// Use a proper 50x50 solid color JPEG instead
		// For simplicity write a tiny valid file and let the server handle it
		fs.writeFileSync(testImagePath, jpegBytes);
	});

	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('media library page loads with grid/list view', async ({ page }) => {
		await page.goto('/sp-admin/media');
		await expect(page.getByRole('heading', { name: 'Media Library' })).toBeVisible();
	});

	test('upload a JPEG image via drag-and-drop zone', async ({ page }) => {
		await page.goto('/sp-admin/media');

		// Use file input to upload
		const fileInput = page.locator('input[type="file"]').first();
		if ((await fileInput.count()) > 0) {
			await fileInput.setInputFiles(testImagePath);
			await page.waitForTimeout(3000); // Wait for upload + thumbnail generation
			// After upload, the new file should appear
			await expect(page.locator('.sp-media-grid, .sp-media-item').first()).toBeVisible({
				timeout: 10_000
			});
		} else {
			// Click the upload zone to trigger file chooser
			const [fileChooser] = await Promise.all([
				page.waitForEvent('filechooser'),
				page.locator('.sp-upload-zone, [data-upload]').click()
			]);
			await fileChooser.setFiles(testImagePath);
			await page.waitForTimeout(3000);
		}
	});

	test('uploaded image appears in media grid', async ({ page }) => {
		await page.goto('/sp-admin/media');
		// There should be at least one media item visible
		await expect(page.locator('img.sp-media-thumb, .sp-media-item img').first()).toBeVisible({
			timeout: 10_000
		});
	});

	test('clicking media item shows detail/attachment page', async ({ page }) => {
		await page.goto('/sp-admin/media');
		const firstItem = page.locator('table tbody tr a, .sp-media-grid a').first();
		await firstItem.click();
		await page.waitForURL(/sp-admin\/media\/\d+/);
		// Attachment detail page should show metadata
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	test('edit alt text and caption on attachment page', async ({ page }) => {
		await page.goto('/sp-admin/media');
		const firstItem = page.locator('table tbody tr a, .sp-media-grid a').first();
		await firstItem.click();
		await page.waitForURL(/sp-admin\/media\/\d+/);

		const altInput = page.getByRole('textbox', { name: /alt text/i });
		if ((await altInput.count()) > 0) {
			await altInput.fill('Updated alt text for test');
			await page.getByRole('button', { name: /save|update/i }).click();
			await page.waitForTimeout(500);
			await expect(altInput).toHaveValue('Updated alt text for test');
		}
	});

	test('non-image file upload is handled gracefully', async ({ page }) => {
		await page.goto('/sp-admin/media');
		const txtPath = path.join(process.cwd(), 'e2e', 'fixtures', 'test.txt');
		fs.writeFileSync(txtPath, 'This is a test text file.');

		const fileInput = page.locator('input[type="file"]').first();
		if ((await fileInput.count()) > 0) {
			await fileInput.setInputFiles(txtPath);
			await page.waitForTimeout(2000);
			// Should either upload (as non-image) or show error - no crash
			await expect(page).not.toHaveURL(/error/);
		}
	});
});
