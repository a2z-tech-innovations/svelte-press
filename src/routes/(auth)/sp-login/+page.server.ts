import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users, userMeta } from '$lib/server/db/schema.js';
import { createSession, SESSION_COOKIE } from '$lib/server/auth/index.js';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as OTPAuth from 'otpauth';
import { logActivity } from '$lib/server/activity/index.js';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/sp-admin/dashboard');
	return {};
};

export const actions: Actions = {
	login: async ({ request, cookies, getClientAddress }) => {
		const data = await request.formData();
		const username = String(data.get('username') ?? '').trim();
		const password = String(data.get('password') ?? '');

		if (!username || !password) {
			return fail(400, { username, error: 'Please enter your username and password.' });
		}

		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.username, username))
			.limit(1);

		if (!user) {
			return fail(400, { username, error: 'Invalid username or password.' });
		}

		const valid = await bcrypt.compare(password, user.passwordHash);
		if (!valid) {
			return fail(400, { username, error: 'Invalid username or password.' });
		}

		// Check if 2FA is enabled for this user
		const totpEnabledMeta = db
			.select()
			.from(userMeta)
			.where(and(eq(userMeta.userId, user.id), eq(userMeta.metaKey, 'totp_enabled')))
			.get();

		if (totpEnabledMeta?.metaValue === '1') {
			// Don't create session yet — store user.id in a temporary cookie
			cookies.set('sp_2fa_pending', String(user.id), {
				path: '/',
				httpOnly: true,
				maxAge: 300,
				sameSite: 'lax'
			});
			redirect(302, '/sp-login?step=2fa');
		}

		// 2FA not enabled — proceed normally
		await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));

		const sessionId = await createSession(user.id);
		cookies.set(SESSION_COOKIE, sessionId, {
			httpOnly: true,
			sameSite: 'lax',
			path: '/',
			maxAge: 30 * 24 * 60 * 60
		});

		logActivity({
			userId: user.id,
			userDisplayName: user.displayName,
			action: 'user_login',
			objectType: 'user',
			objectId: user.id,
			objectTitle: user.displayName,
			ip: getClientAddress()
		}).catch(() => {});

		redirect(302, '/sp-admin/dashboard');
	},

	verify2faLogin: async ({ request, cookies, getClientAddress }) => {
		const pendingUserId = cookies.get('sp_2fa_pending');
		if (!pendingUserId) redirect(302, '/sp-login');

		const userId = parseInt(pendingUserId, 10);
		if (isNaN(userId)) redirect(302, '/sp-login');

		const data = await request.formData();
		const code = String(data.get('code') ?? '').trim().replace(/\s/g, '');

		if (!code) {
			return fail(400, { twoFactorError: 'Please enter the authentication code.' });
		}

		// Load the user and their TOTP secret
		const user = db.select().from(users).where(eq(users.id, userId)).get();
		if (!user) redirect(302, '/sp-login');

		const secretMeta = db
			.select()
			.from(userMeta)
			.where(and(eq(userMeta.userId, userId), eq(userMeta.metaKey, 'totp_secret')))
			.get();

		if (!secretMeta?.metaValue) {
			// No secret found — clear pending cookie and let them in (safety fallback)
			cookies.delete('sp_2fa_pending', { path: '/' });
			const sessionId = await createSession(userId);
			cookies.set(SESSION_COOKIE, sessionId, {
				httpOnly: true,
				sameSite: 'lax',
				path: '/',
				maxAge: 30 * 24 * 60 * 60
			});
			redirect(302, '/sp-admin/dashboard');
		}

		// Try TOTP verification first
		let verified = false;

		const delta = OTPAuth.TOTP.validate({
			token: code,
			secret: OTPAuth.Secret.fromBase32(secretMeta.metaValue),
			algorithm: 'SHA1',
			digits: 6,
			period: 30,
			window: 1
		});

		if (delta !== null) {
			verified = true;
		}

		// If TOTP failed, check backup codes
		if (!verified) {
			const backupCodesMeta = db
				.select()
				.from(userMeta)
				.where(and(eq(userMeta.userId, userId), eq(userMeta.metaKey, 'totp_backup_codes')))
				.get();

			if (backupCodesMeta?.metaValue) {
				let backupCodes: string[] = [];
				try {
					backupCodes = JSON.parse(backupCodesMeta.metaValue);
				} catch {
					backupCodes = [];
				}

				// Check each hashed backup code
				for (let i = 0; i < backupCodes.length; i++) {
					const match = await bcrypt.compare(code, backupCodes[i]);
					if (match) {
						// Remove used backup code
						backupCodes.splice(i, 1);
						await db
							.update(userMeta)
							.set({ metaValue: JSON.stringify(backupCodes) })
							.where(
								and(eq(userMeta.userId, userId), eq(userMeta.metaKey, 'totp_backup_codes'))
							);
						verified = true;
						break;
					}
				}
			}
		}

		if (!verified) {
			return fail(400, { twoFactorError: 'Invalid authentication code. Please try again.' });
		}

		// Code is valid — clear pending cookie, create real session
		cookies.delete('sp_2fa_pending', { path: '/' });

		await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, userId));

		const sessionId = await createSession(userId);
		cookies.set(SESSION_COOKIE, sessionId, {
			httpOnly: true,
			sameSite: 'lax',
			path: '/',
			maxAge: 30 * 24 * 60 * 60
		});

		logActivity({
			userId: user!.id,
			userDisplayName: user!.displayName,
			action: 'user_login',
			objectType: 'user',
			objectId: user!.id,
			objectTitle: user!.displayName,
			details: { method: '2fa' },
			ip: getClientAddress()
		}).catch(() => {});

		redirect(302, '/sp-admin/dashboard');
	}
};
