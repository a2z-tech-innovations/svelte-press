import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users, options } from '$lib/server/db/schema.js';
import { createSession, SESSION_COOKIE } from '$lib/server/auth/index.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/sp-admin/dashboard');
	// Check if registration is open
	const [regOpt] = await db
		.select()
		.from(options)
		.where(eq(options.optionName, 'users_can_register'))
		.limit(1);
	const canRegister = regOpt?.optionValue === '1';
	return { canRegister };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = String(data.get('username') ?? '').trim();
		const email = String(data.get('email') ?? '').trim();
		const displayName = String(data.get('displayName') ?? '').trim() || username;
		const password = String(data.get('password') ?? '');
		const confirmPassword = String(data.get('confirmPassword') ?? '');

		const errors: Record<string, string> = {};

		if (!username || username.length < 3) errors.username = 'Username must be at least 3 characters.';
		if (!email || !email.includes('@')) errors.email = 'Please enter a valid email address.';
		if (!password || password.length < 8) errors.password = 'Password must be at least 8 characters.';
		if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';

		if (Object.keys(errors).length > 0) {
			return fail(400, { username, email, displayName, errors });
		}

		// Check uniqueness
		const [existingUser] = await db.select().from(users).where(eq(users.username, username)).limit(1);
		if (existingUser) return fail(400, { username, email, displayName, errors: { username: 'That username is already taken.' } });

		const [existingEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
		if (existingEmail) return fail(400, { username, email, displayName, errors: { email: 'That email is already registered.' } });

		// Get default role
		const [roleOpt] = await db.select().from(options).where(eq(options.optionName, 'default_role')).limit(1);
		const role = (roleOpt?.optionValue ?? 'subscriber') as 'subscriber';

		const passwordHash = await bcrypt.hash(password, 12);
		const [newUser] = await db
			.insert(users)
			.values({ username, email, displayName, passwordHash, role })
			.returning({ id: users.id });

		const sessionId = await createSession(newUser.id);
		cookies.set(SESSION_COOKIE, sessionId, {
			httpOnly: true,
			sameSite: 'lax',
			path: '/',
			maxAge: 30 * 24 * 60 * 60
		});

		redirect(302, '/sp-admin/dashboard');
	}
};
