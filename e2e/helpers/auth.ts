import { type Page } from '@playwright/test';

export async function login(page: Page, username = 'admin', password = 'password') {
	await page.goto('/sp-login');
	await page.getByRole('textbox', { name: 'Username' }).fill(username);
	await page.getByRole('textbox', { name: 'Password' }).fill(password);
	await page.getByRole('button', { name: 'Sign In' }).click();
	await page.waitForURL('**/sp-admin/**');
}

export async function logout(page: Page) {
	await page.getByRole('button', { name: /Administrator|editor|subscriber/i }).click();
	await page.getByRole('button', { name: 'Log Out' }).click();
	await page.waitForURL('**/sp-login**');
}

export async function loginAs(page: Page, username: string) {
	await page.context().clearCookies();
	await login(page, username, 'TestPass123!');
}
