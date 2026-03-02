import { fail, redirect, isRedirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { auth } from '$lib/auth.js';
import { or, eq } from 'drizzle-orm';
import { logActivity } from '$lib/server/activity/index.js';
import { checkRateLimit } from '$lib/server/ratelimit/index.js';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/sp-admin/dashboard');
	return {};
};

export const actions: Actions = {
	login: async (event) => {
		const { limited, retryAfterSecs } = checkRateLimit(
			`login:${event.getClientAddress()}`,
			{ max: 10, windowMs: 15 * 60 * 1000 }
		);
		if (limited) return fail(429, { error: `Too many login attempts. Try again in ${retryAfterSecs} seconds.` });

		const data = await event.request.formData();
		// Accept username OR email (kept as "username" field in the form)
		const identifier = String(data.get('username') ?? '').trim();
		const password = String(data.get('password') ?? '');

		if (!identifier || !password) {
			return fail(400, { username: identifier, error: 'Please enter your username and password.' });
		}

		// Look up by username OR email to support both login methods
		const dbUser = db
			.select()
			.from(users)
			.where(or(eq(users.username, identifier), eq(users.email, identifier)))
			.get();

		if (!dbUser) {
			return fail(400, { username: identifier, error: 'Invalid username or password.' });
		}

		try {
			const result = await auth.api.signInEmail({
				body: { email: dbUser.email, password },
				headers: event.request.headers
			});

			// If 2FA is required, BA returns { twoFactorRedirect: true }
			// BA has already set its signed two-factor cookie — we also set sp_2fa_pending for activity logging
			if (result && 'twoFactorRedirect' in result && result.twoFactorRedirect) {
				event.cookies.set('sp_2fa_pending', String(dbUser.id), {
					path: '/',
					httpOnly: true,
					maxAge: 600,
					sameSite: 'lax'
				});
				redirect(302, '/sp-login?step=2fa');
			}
		} catch (e) {
			if (isRedirect(e)) throw e;
			return fail(400, { username: identifier, error: 'Invalid username or password.' });
		}

		// Update lastLogin and log activity
		await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, dbUser.id));

		logActivity({
			userId: dbUser.id,
			userDisplayName: dbUser.displayName,
			action: 'user_login',
			objectType: 'user',
			objectId: dbUser.id,
			objectTitle: dbUser.displayName,
			ip: event.getClientAddress()
		}).catch(() => {});

		redirect(302, '/sp-admin/dashboard');
	},

	verify2faLogin: async (event) => {
		const { limited: twoFaLimited, retryAfterSecs: twoFaRetry } = checkRateLimit(
			`2fa:${event.getClientAddress()}`,
			{ max: 10, windowMs: 15 * 60 * 1000 }
		);
		if (twoFaLimited) return fail(429, { twoFactorError: `Too many attempts. Try again in ${twoFaRetry} seconds.` });

		const pendingUserId = event.cookies.get('sp_2fa_pending');
		if (!pendingUserId) redirect(302, '/sp-login');

		const userId = parseInt(pendingUserId, 10);
		if (isNaN(userId)) redirect(302, '/sp-login');

		const data = await event.request.formData();
		const code = String(data.get('code') ?? '').trim().replace(/\s/g, '');

		if (!code) {
			return fail(400, { twoFactorError: 'Please enter the authentication code.' });
		}

		// Try TOTP first, then backup code — BA handles both via the same verifyTOTP endpoint
		let verified = false;
		let isTotpError = false;

		try {
			await auth.api.verifyTOTP({
				body: { code },
				headers: event.request.headers
			});
			verified = true;
		} catch {
			isTotpError = true;
		}

		// If TOTP failed, try backup code
		if (!verified && isTotpError) {
			try {
				await auth.api.verifyBackupCode({
					body: { code },
					headers: event.request.headers
				});
				verified = true;
			} catch {
				// Both failed
			}
		}

		if (!verified) {
			return fail(400, { twoFactorError: 'Invalid authentication code. Please try again.' });
		}

		// Code verified — clean up our cookie and log activity
		event.cookies.delete('sp_2fa_pending', { path: '/' });

		const dbUser = db.select().from(users).where(eq(users.id, userId)).get();
		if (dbUser) {
			await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, userId));

			logActivity({
				userId: dbUser.id,
				userDisplayName: dbUser.displayName,
				action: 'user_login',
				objectType: 'user',
				objectId: dbUser.id,
				objectTitle: dbUser.displayName,
				details: { method: '2fa' },
				ip: event.getClientAddress()
			}).catch(() => {});
		}

		redirect(302, '/sp-admin/dashboard');
	}
};
