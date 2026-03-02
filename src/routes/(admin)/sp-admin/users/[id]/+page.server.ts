import { fail, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users, userMeta, account } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { can } from '$lib/server/permissions/index.js';
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

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

	const avatarMeta = db.select().from(userMeta).where(
		and(eq(userMeta.userId, id), eq(userMeta.metaKey, 'avatar_url'))
	).get();
	const customAvatarUrl = avatarMeta?.metaValue ?? null;

	return { user, customAvatarUrl };
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

		let newPasswordHash: string | undefined;
		if (password) {
			if (password !== confirmPassword) {
				return fail(400, { error: 'Passwords do not match.' });
			}
			if (password.length < 6) {
				return fail(400, { error: 'Password must be at least 6 characters.' });
			}
			newPasswordHash = await bcrypt.hash(password, 10);
			updateData.passwordHash = newPasswordHash;
		}

		await db.update(users).set(updateData as typeof users.$inferInsert).where(eq(users.id, id));

		// Keep Better Auth account record in sync when password changes
		if (newPasswordHash) {
			const accountRow = db.select({ id: account.id }).from(account)
				.where(and(eq(account.userId, id), eq(account.providerId, 'credential')))
				.get();
			if (accountRow) {
				await db.update(account).set({ password: newPasswordHash, updatedAt: new Date() })
					.where(eq(account.id, accountRow.id));
			} else {
				// Account record missing — create it so the user can log in
				await db.insert(account).values({
					id: crypto.randomUUID(),
					userId: id,
					accountId: String(id),
					providerId: 'credential',
					password: newPasswordHash,
					createdAt: new Date(),
					updatedAt: new Date()
				});
			}
		}

		return { success: true };
	},

	uploadAvatar: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { avatarError: 'Not authenticated.' });
		if (!can(locals.user.role, 'manage_users')) return fail(403, { avatarError: 'Insufficient permissions.' });

		const userId = Number(params.id);
		if (!userId) return fail(400, { avatarError: 'Invalid user ID.' });

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
