import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users, userMeta } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { nanoid } from 'nanoid';

export const load: PageServerLoad = async ({ locals }) => {
	const user = db
		.select({
			id: users.id,
			username: users.username,
			email: users.email,
			displayName: users.displayName,
			bio: users.bio,
			avatar: users.avatar,
			role: users.role,
			registeredAt: users.registeredAt,
			lastLogin: users.lastLogin
		})
		.from(users)
		.where(eq(users.id, locals.user!.id))
		.get();

	const avatarMeta = db
		.select()
		.from(userMeta)
		.where(and(eq(userMeta.userId, locals.user!.id), eq(userMeta.metaKey, 'avatar_url')))
		.get();
	const customAvatarUrl = avatarMeta?.metaValue ?? null;

	// Load 2FA status
	const totpEnabledMeta = db
		.select()
		.from(userMeta)
		.where(and(eq(userMeta.userId, locals.user!.id), eq(userMeta.metaKey, 'totp_enabled')))
		.get();
	const totpEnabled = totpEnabledMeta?.metaValue === '1';

	return { user: user!, customAvatarUrl, totpEnabled };
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
			const user = db
				.select({ passwordHash: users.passwordHash })
				.from(users)
				.where(eq(users.id, id))
				.get();
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

		await sharp(buffer).resize(96, 96, { fit: 'cover' }).webp({ quality: 85 }).toFile(absPath);

		const existing = db
			.select()
			.from(userMeta)
			.where(and(eq(userMeta.userId, userId), eq(userMeta.metaKey, 'avatar_url')))
			.get();

		if (existing) {
			await db
				.update(userMeta)
				.set({ metaValue: avatarUrl })
				.where(eq(userMeta.id, existing.id));
		} else {
			await db.insert(userMeta).values({ userId, metaKey: 'avatar_url', metaValue: avatarUrl });
		}

		return { avatarSuccess: true };
	},

	setup2fa: async ({ locals }) => {
		if (!locals.user) return fail(401, { totpError: 'Not authenticated.' });

		const secret = new OTPAuth.Secret({ size: 20 });
		const totp = new OTPAuth.TOTP({
			issuer: 'SveltePress',
			label: locals.user.email,
			algorithm: 'SHA1',
			digits: 6,
			period: 30,
			secret
		});

		const otpAuthUrl = totp.toString();
		const qrDataUrl = await QRCode.toDataURL(otpAuthUrl, {
			errorCorrectionLevel: 'M',
			width: 200
		});
		const secretBase32 = secret.base32;

		// Store the pending secret so verify2fa can read it back
		const existing = db
			.select()
			.from(userMeta)
			.where(
				and(
					eq(userMeta.userId, locals.user.id),
					eq(userMeta.metaKey, 'totp_secret_pending')
				)
			)
			.get();

		if (existing) {
			await db
				.update(userMeta)
				.set({ metaValue: secretBase32 })
				.where(eq(userMeta.id, existing.id));
		} else {
			await db.insert(userMeta).values({
				userId: locals.user.id,
				metaKey: 'totp_secret_pending',
				metaValue: secretBase32
			});
		}

		return { setup2fa: { qrDataUrl, secretBase32, otpAuthUrl } };
	},

	verify2fa: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { totpError: 'Not authenticated.' });

		const data = await request.formData();
		const code = String(data.get('code') ?? '').trim().replace(/\s/g, '');

		if (!code || code.length !== 6) {
			return fail(400, { totpError: 'Please enter a valid 6-digit code.' });
		}

		// Load pending secret
		const pendingMeta = db
			.select()
			.from(userMeta)
			.where(
				and(
					eq(userMeta.userId, locals.user.id),
					eq(userMeta.metaKey, 'totp_secret_pending')
				)
			)
			.get();

		if (!pendingMeta?.metaValue) {
			return fail(400, { totpError: 'Setup session expired. Please start again.' });
		}

		const secretBase32 = pendingMeta.metaValue;

		const delta = OTPAuth.TOTP.validate({
			token: code,
			secret: OTPAuth.Secret.fromBase32(secretBase32),
			algorithm: 'SHA1',
			digits: 6,
			period: 30,
			window: 1
		});

		if (delta === null) {
			return fail(400, { totpError: 'Invalid code. Please check your authenticator app and try again.' });
		}

		// Code verified — promote pending secret to active
		const existingSecret = db
			.select()
			.from(userMeta)
			.where(
				and(eq(userMeta.userId, locals.user.id), eq(userMeta.metaKey, 'totp_secret'))
			)
			.get();

		if (existingSecret) {
			await db
				.update(userMeta)
				.set({ metaValue: secretBase32 })
				.where(eq(userMeta.id, existingSecret.id));
		} else {
			await db.insert(userMeta).values({
				userId: locals.user.id,
				metaKey: 'totp_secret',
				metaValue: secretBase32
			});
		}

		// Set totp_enabled = '1'
		const existingEnabled = db
			.select()
			.from(userMeta)
			.where(
				and(eq(userMeta.userId, locals.user.id), eq(userMeta.metaKey, 'totp_enabled'))
			)
			.get();

		if (existingEnabled) {
			await db
				.update(userMeta)
				.set({ metaValue: '1' })
				.where(eq(userMeta.id, existingEnabled.id));
		} else {
			await db.insert(userMeta).values({
				userId: locals.user.id,
				metaKey: 'totp_enabled',
				metaValue: '1'
			});
		}

		// Generate 8 backup codes
		const plainCodes: string[] = [];
		const hashedCodes: string[] = [];
		for (let i = 0; i < 8; i++) {
			const code = nanoid(10);
			plainCodes.push(code);
			hashedCodes.push(await bcrypt.hash(code, 10));
		}

		// Store hashed backup codes
		const existingBackup = db
			.select()
			.from(userMeta)
			.where(
				and(eq(userMeta.userId, locals.user.id), eq(userMeta.metaKey, 'totp_backup_codes'))
			)
			.get();

		if (existingBackup) {
			await db
				.update(userMeta)
				.set({ metaValue: JSON.stringify(hashedCodes) })
				.where(eq(userMeta.id, existingBackup.id));
		} else {
			await db.insert(userMeta).values({
				userId: locals.user.id,
				metaKey: 'totp_backup_codes',
				metaValue: JSON.stringify(hashedCodes)
			});
		}

		// Remove the pending secret
		await db
			.delete(userMeta)
			.where(
				and(
					eq(userMeta.userId, locals.user.id),
					eq(userMeta.metaKey, 'totp_secret_pending')
				)
			);

		return { totpEnabled: true, backupCodes: plainCodes };
	},

	disable2fa: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { disableError: 'Not authenticated.' });

		const data = await request.formData();
		const password = String(data.get('disablePassword') ?? '');
		const code = String(data.get('disableCode') ?? '').trim().replace(/\s/g, '');

		if (!password) {
			return fail(400, { disableError: 'Please enter your current password.' });
		}
		if (!code) {
			return fail(400, { disableError: 'Please enter your authentication code.' });
		}

		// Verify current password
		const user = db
			.select({ passwordHash: users.passwordHash })
			.from(users)
			.where(eq(users.id, locals.user.id))
			.get();
		if (!user) return fail(400, { disableError: 'User not found.' });

		const passwordValid = await bcrypt.compare(password, user.passwordHash);
		if (!passwordValid) return fail(400, { disableError: 'Current password is incorrect.' });

		// Verify TOTP code (or backup code)
		const secretMeta = db
			.select()
			.from(userMeta)
			.where(
				and(eq(userMeta.userId, locals.user.id), eq(userMeta.metaKey, 'totp_secret'))
			)
			.get();

		if (!secretMeta?.metaValue) {
			return fail(400, { disableError: '2FA is not configured.' });
		}

		let codeValid = false;

		const delta = OTPAuth.TOTP.validate({
			token: code,
			secret: OTPAuth.Secret.fromBase32(secretMeta.metaValue),
			algorithm: 'SHA1',
			digits: 6,
			period: 30,
			window: 1
		});

		if (delta !== null) {
			codeValid = true;
		}

		if (!codeValid) {
			// Try backup codes
			const backupMeta = db
				.select()
				.from(userMeta)
				.where(
					and(eq(userMeta.userId, locals.user.id), eq(userMeta.metaKey, 'totp_backup_codes'))
				)
				.get();

			if (backupMeta?.metaValue) {
				let backupCodes: string[] = [];
				try {
					backupCodes = JSON.parse(backupMeta.metaValue);
				} catch {
					backupCodes = [];
				}
				for (let i = 0; i < backupCodes.length; i++) {
					const match = await bcrypt.compare(code, backupCodes[i]);
					if (match) {
						codeValid = true;
						break;
					}
				}
			}
		}

		if (!codeValid) {
			return fail(400, { disableError: 'Invalid authentication code.' });
		}

		// Remove all 2FA meta keys
		await db
			.delete(userMeta)
			.where(
				and(eq(userMeta.userId, locals.user.id), eq(userMeta.metaKey, 'totp_secret'))
			);
		await db
			.delete(userMeta)
			.where(
				and(eq(userMeta.userId, locals.user.id), eq(userMeta.metaKey, 'totp_enabled'))
			);
		await db
			.delete(userMeta)
			.where(
				and(eq(userMeta.userId, locals.user.id), eq(userMeta.metaKey, 'totp_backup_codes'))
			);
		await db
			.delete(userMeta)
			.where(
				and(eq(userMeta.userId, locals.user.id), eq(userMeta.metaKey, 'totp_secret_pending'))
			);

		return { totpDisabled: true };
	}
};
