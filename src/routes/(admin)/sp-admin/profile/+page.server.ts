import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users, userMeta } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

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

	const avatarMeta = db.select().from(userMeta).where(
		and(eq(userMeta.userId, locals.user!.id), eq(userMeta.metaKey, 'avatar_url'))
	).get();
	const customAvatarUrl = avatarMeta?.metaValue ?? null;

	return { user: user!, customAvatarUrl };
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
	},

	uploadAvatar: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { avatarError: 'Not authenticated.' });
		const userId = locals.user.id;

		const data = await request.formData();
		const file = data.get('avatar') as File;

		if (!file || !file.size) return fail(400, { avatarError: 'No file selected.' });
		if (!file.type.startsWith('image/')) return fail(400, { avatarError: 'Must be an image file.' });
		if (file.size > 2 * 1024 * 1024) return fail(400, { avatarError: 'File must be under 2MB.' });

		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);

		const absDir = join('static', 'uploads', 'avatars');
		mkdirSync(absDir, { recursive: true });

		const filename = `${userId}.webp`;
		const absPath = join(absDir, filename);
		const avatarUrl = `/uploads/avatars/${filename}`;

		await sharp(buffer)
			.resize(96, 96, { fit: 'cover' })
			.webp({ quality: 85 })
			.toFile(absPath);

		const existing = db.select().from(userMeta).where(
			and(eq(userMeta.userId, userId), eq(userMeta.metaKey, 'avatar_url'))
		).get();

		if (existing) {
			await db.update(userMeta).set({ metaValue: avatarUrl }).where(eq(userMeta.id, existing.id));
		} else {
			await db.insert(userMeta).values({ userId, metaKey: 'avatar_url', metaValue: avatarUrl });
		}

		return { avatarSuccess: true };
	}
};
