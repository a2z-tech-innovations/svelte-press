import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users, options } from '$lib/server/db/schema.js';
import { auth } from '$lib/auth.js';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/sp-admin/dashboard');
	// Check if registration is open
	const regOpt = db.select().from(options).where(eq(options.optionName, 'users_can_register')).get();
	const canRegister = regOpt?.optionValue === '1';
	return { canRegister };
};

export const actions: Actions = {
	default: async (event) => {
		const data = await event.request.formData();
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

		// Check username uniqueness (email uniqueness is enforced by BA)
		const existingUser = db.select().from(users).where(eq(users.username, username)).get();
		if (existingUser) {
			return fail(400, {
				username,
				email,
				displayName,
				errors: { username: 'That username is already taken.' }
			});
		}

		// Get default role from site options
		const roleOpt = db.select().from(options).where(eq(options.optionName, 'default_role')).get();
		const role = (roleOpt?.optionValue ?? 'subscriber') as
			| 'admin'
			| 'editor'
			| 'author'
			| 'contributor'
			| 'subscriber';

		// Create user via Better Auth (handles password hashing, account row, session + cookie)
		try {
			await auth.api.signUpEmail({
				body: { email, password, name: displayName },
				headers: event.request.headers
			});
		} catch (e: unknown) {
			const message =
				e instanceof Error && e.message.toLowerCase().includes('email')
					? 'That email is already registered.'
					: 'Registration failed. Please try again.';
			return fail(400, { username, email, displayName, errors: { email: message } });
		}

		// BA created the user with displayName (from "name") — now set username and role
		// which BA doesn't know about
		await db
			.update(users)
			.set({ username, role })
			.where(eq(users.email, email));

		redirect(302, '/sp-admin/dashboard');
	}
};
