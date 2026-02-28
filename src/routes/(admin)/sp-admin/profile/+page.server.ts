import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export const load: PageServerLoad = async ({ locals }) => {
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
	}).from(users).where(eq(users.id, locals.user!.id)).get();

	return { user: user! };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const id = locals.user!.id;
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim();
		const firstName = String(data.get('firstName') ?? '').trim();
		const lastName = String(data.get('lastName') ?? '').trim();
		const bio = String(data.get('bio') ?? '');
		const displayName = [firstName, lastName].filter(Boolean).join(' ');
		const currentPassword = String(data.get('currentPassword') ?? '');
		const newPassword = String(data.get('newPassword') ?? '');
		const confirmPassword = String(data.get('confirmPassword') ?? '');

		if (!email) return fail(400, { error: 'Email is required.' });

		// Check email uniqueness
		const existingEmail = db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
		if (existingEmail && existingEmail.id !== id) {
			return fail(400, { error: 'Email already in use.' });
		}

		const updateData: Record<string, unknown> = {
			email,
			displayName: displayName || locals.user!.displayName,
			bio
		};

		if (newPassword) {
			if (newPassword !== confirmPassword) {
				return fail(400, { error: 'New passwords do not match.' });
			}
			if (newPassword.length < 6) {
				return fail(400, { error: 'Password must be at least 6 characters.' });
			}
			// Verify current password
			const user = db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, id)).get();
			if (!user) return fail(400, { error: 'User not found.' });
			const valid = await bcrypt.compare(currentPassword, user.passwordHash);
			if (!valid) return fail(400, { error: 'Current password is incorrect.' });
			updateData.passwordHash = await bcrypt.hash(newPassword, 10);
		}

		await db.update(users).set(updateData as typeof users.$inferInsert).where(eq(users.id, id));

		return { success: true };
	}
};
