import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { createSession, SESSION_COOKIE } from '$lib/server/auth/index.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/sp-admin/dashboard');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
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

		await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));

		const sessionId = await createSession(user.id);
		cookies.set(SESSION_COOKIE, sessionId, {
			httpOnly: true,
			sameSite: 'lax',
			path: '/',
			maxAge: 30 * 24 * 60 * 60
		});

		redirect(302, '/sp-admin/dashboard');
	}
};
