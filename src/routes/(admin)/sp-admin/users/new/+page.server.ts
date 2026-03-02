import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users, account } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const username = String(data.get('username') ?? '').trim();
		const email = String(data.get('email') ?? '').trim();
		const firstName = String(data.get('firstName') ?? '').trim();
		const lastName = String(data.get('lastName') ?? '').trim();
		const website = String(data.get('website') ?? '').trim();
		const role = String(data.get('role') ?? 'subscriber') as 'admin' | 'editor' | 'author' | 'contributor' | 'subscriber';
		const password = String(data.get('password') ?? '');

		if (!username) return fail(400, { error: 'Username is required.' });
		if (!email) return fail(400, { error: 'Email is required.' });
		if (!password) return fail(400, { error: 'Password is required.' });

		// Check unique username
		const existingUser = db.select({ id: users.id }).from(users).where(eq(users.username, username)).get();
		if (existingUser) return fail(400, { error: 'Username already exists.' });

		const existingEmail = db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
		if (existingEmail) return fail(400, { error: 'Email already in use.' });

		const displayName = [firstName, lastName].filter(Boolean).join(' ') || username;
		const passwordHash = await bcrypt.hash(password, 10);

		const result = await db.insert(users).values({
			username,
			email,
			displayName,
			passwordHash,
			role,
			bio: '',
			avatar: website ? website : '',
			registeredAt: new Date()
		}).returning({ id: users.id });

		const newUserId = result[0].id;

		// Create Better Auth account record so the user can sign in with their password
		await db.insert(account).values({
			id: crypto.randomUUID(),
			userId: newUserId,
			accountId: String(newUserId),
			providerId: 'credential',
			password: passwordHash,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		redirect(302, `/sp-admin/users/${newUserId}`);
	}
};
