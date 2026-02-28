import { fail, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	if (!id) error(404, 'User not found');

	const user = db.select({
		id: users.id,
		username: users.username,
		email: users.email,
		displayName: users.displayName,
		bio: users.bio,
		avatar: users.avatar,
		role: users.role,
		registeredAt: users.registeredAt,
		lastLogin: users.lastLogin
	}).from(users).where(eq(users.id, id)).get();

	if (!user) error(404, 'User not found');

	return { user };
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const id = Number(params.id);
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim();
		const firstName = String(data.get('firstName') ?? '').trim();
		const lastName = String(data.get('lastName') ?? '').trim();
		const website = String(data.get('website') ?? '').trim();
		const bio = String(data.get('bio') ?? '');
		const role = String(data.get('role') ?? 'subscriber') as 'admin' | 'editor' | 'author' | 'contributor' | 'subscriber';
		const password = String(data.get('password') ?? '');
		const confirmPassword = String(data.get('confirmPassword') ?? '');

		if (!email) return fail(400, { error: 'Email is required.' });

		// Check email uniqueness (excluding self)
		const existingEmail = db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
		if (existingEmail && existingEmail.id !== id) {
			return fail(400, { error: 'Email already in use.' });
		}

		const displayName = [firstName, lastName].filter(Boolean).join(' ');

		const updateData: Record<string, unknown> = {
			email,
			displayName: displayName || undefined,
			bio,
			role
		};

		if (password) {
			if (password !== confirmPassword) {
				return fail(400, { error: 'Passwords do not match.' });
			}
			if (password.length < 6) {
				return fail(400, { error: 'Password must be at least 6 characters.' });
			}
			updateData.passwordHash = await bcrypt.hash(password, 10);
		}

		await db.update(users).set(updateData as typeof users.$inferInsert).where(eq(users.id, id));

		return { success: true };
	}
};
