import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users, userMeta, twoFactor, account } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';
import QRCode from 'qrcode';
import { createOTP } from '@better-auth/utils/otp';
import { createRandomStringGenerator } from '@better-auth/utils/random';
import { symmetricEncrypt, symmetricDecrypt } from 'better-auth/crypto';

// Matches BA's internal generateRandomString used by enableTwoFactor
const generateRandomString = createRandomStringGenerator('a-z', '0-9', 'A-Z', '-_');

// BA uses process.env.BETTER_AUTH_SECRET as the encryption key when no versioned secrets are configured.
// Falls back to BA's own DEFAULT_SECRET so the encrypted TOTP data is always readable by BA's verifyTOTP.
const getSecret = () =>
	process.env.BETTER_AUTH_SECRET ||
	process.env.AUTH_SECRET ||
	'better-auth-secret-12345678901234567890';

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

	// Check 2FA status from users table (set by BA's verifyTOTP on first successful verify)
	const dbUser = db.select({ twoFactorEnabled: users.twoFactorEnabled }).from(users).where(eq(users.id, locals.user!.id)).get();
	const totpEnabled = dbUser?.twoFactorEnabled === true;

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
			if (newPassword.length < 8) {
				return fail(400, { error: 'Password must be at least 8 characters.' });
			}

			// Verify current password — check account table (BA's source) with bcrypt fallback to passwordHash
			const acct = db
				.select({ password: account.password })
				.from(account)
				.where(and(eq(account.userId, id), eq(account.providerId, 'credential')))
				.get();

			const hashToCheck = acct?.password ?? null;
			const user = hashToCheck
				? null
				: db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, id)).get();

			const valid = hashToCheck
				? await bcrypt.compare(currentPassword, hashToCheck)
				: user
					? await bcrypt.compare(currentPassword, user.passwordHash)
					: false;

			if (!valid) return fail(400, { error: 'Current password is incorrect.' });

			const newHash = await bcrypt.hash(newPassword, 10);
			updateData.passwordHash = newHash;

			// Keep BA's account table in sync
			if (acct) {
				await db
					.update(account)
					.set({ password: newHash })
					.where(and(eq(account.userId, id), eq(account.providerId, 'credential')));
			}
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

		// Generate a random secret the same way BA does internally
		const secret = generateRandomString(32);

		// Build the TOTP URI (same format as BA's enableTwoFactor endpoint returns)
		const otpAuthUrl = createOTP(secret, { digits: 6, period: 30 }).url(
			'SveltePress',
			locals.user.email
		);

		const qrDataUrl = await QRCode.toDataURL(otpAuthUrl, {
			errorCorrectionLevel: 'M',
			width: 200
		});

		// Extract the base32-encoded secret from the URL for manual entry
		const urlObj = new URL(otpAuthUrl);
		const secretBase32 = urlObj.searchParams.get('secret') ?? '';

		// Store pending secret (unencrypted) so verify2fa can read it back
		const existing = db
			.select()
			.from(userMeta)
			.where(and(eq(userMeta.userId, locals.user.id), eq(userMeta.metaKey, 'totp_secret_pending')))
			.get();

		if (existing) {
			await db
				.update(userMeta)
				.set({ metaValue: secret })
				.where(eq(userMeta.id, existing.id));
		} else {
			await db.insert(userMeta).values({
				userId: locals.user.id,
				metaKey: 'totp_secret_pending',
				metaValue: secret
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
				and(eq(userMeta.userId, locals.user.id), eq(userMeta.metaKey, 'totp_secret_pending'))
			)
			.get();

		if (!pendingMeta?.metaValue) {
			return fail(400, { totpError: 'Setup session expired. Please start again.' });
		}

		const secret = pendingMeta.metaValue;

		// Verify the TOTP code using the same logic BA uses internally
		const isValid = await createOTP(secret, { digits: 6, period: 30 }).verify(code, { window: 1 });

		if (!isValid) {
			return fail(400, {
				totpError: 'Invalid code. Please check your authenticator app and try again.'
			});
		}

		const baSecret = getSecret();

		// Encrypt the TOTP secret using BA's encryption (matches what verifyTOTP expects)
		const encryptedSecret = await symmetricEncrypt({ key: baSecret, data: secret });

		// Generate 10 backup codes and encrypt them as BA does (storeBackupCodes: "encrypted")
		const plainCodes: string[] = Array.from({ length: 10 }, () => {
			const part1 = randomBytes(4).toString('base64url').slice(0, 5);
			const part2 = randomBytes(4).toString('base64url').slice(0, 5);
			return `${part1}-${part2}`;
		});
		const encryptedBackupCodes = await symmetricEncrypt({
			key: baSecret,
			data: JSON.stringify(plainCodes)
		});

		// Upsert the twoFactor row (BA's table)
		const existing = db
			.select()
			.from(twoFactor)
			.where(eq(twoFactor.userId, locals.user.id))
			.get();

		if (existing) {
			await db
				.update(twoFactor)
				.set({ secret: encryptedSecret, backupCodes: encryptedBackupCodes })
				.where(eq(twoFactor.id, existing.id));
		} else {
			await db.insert(twoFactor).values({
				id: crypto.randomUUID(),
				userId: locals.user.id,
				secret: encryptedSecret,
				backupCodes: encryptedBackupCodes
			});
		}

		// Mark 2FA as enabled in users table
		await db
			.update(users)
			.set({ twoFactorEnabled: true })
			.where(eq(users.id, locals.user.id));

		// Remove pending secret
		await db
			.delete(userMeta)
			.where(
				and(eq(userMeta.userId, locals.user.id), eq(userMeta.metaKey, 'totp_secret_pending'))
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

		// Verify password from BA's account table (falls back to users.passwordHash)
		const acct = db
			.select({ password: account.password })
			.from(account)
			.where(and(eq(account.userId, locals.user.id), eq(account.providerId, 'credential')))
			.get();

		const hashToCheck = acct?.password ?? null;
		const userRow = hashToCheck
			? null
			: db
					.select({ passwordHash: users.passwordHash })
					.from(users)
					.where(eq(users.id, locals.user.id))
					.get();

		const passwordValid = hashToCheck
			? await bcrypt.compare(password, hashToCheck)
			: userRow
				? await bcrypt.compare(password, userRow.passwordHash)
				: false;

		if (!passwordValid) return fail(400, { disableError: 'Current password is incorrect.' });

		// Load the 2FA record
		const tfRecord = db
			.select()
			.from(twoFactor)
			.where(eq(twoFactor.userId, locals.user.id))
			.get();

		if (!tfRecord) {
			return fail(400, { disableError: '2FA is not configured.' });
		}

		const baSecret = getSecret();

		// Decrypt the TOTP secret and verify the code
		let codeValid = false;
		try {
			const secret = await symmetricDecrypt({ key: baSecret, data: tfRecord.secret });
			codeValid = await createOTP(secret, { digits: 6, period: 30 }).verify(code, { window: 1 });
		} catch {
			// Decryption failed — secret may be in old format
		}

		// If TOTP failed, try backup codes
		if (!codeValid) {
			try {
				const codesJson = await symmetricDecrypt({ key: baSecret, data: tfRecord.backupCodes });
				const codes: string[] = JSON.parse(codesJson);
				if (codes.includes(code)) {
					codeValid = true;
					// Remove used backup code
					const updated = codes.filter((c) => c !== code);
					await db
						.update(twoFactor)
						.set({
							backupCodes: await symmetricEncrypt({ key: baSecret, data: JSON.stringify(updated) })
						})
						.where(eq(twoFactor.id, tfRecord.id));
				}
			} catch {
				// Backup codes may be in old format — ignore
			}
		}

		if (!codeValid) {
			return fail(400, { disableError: 'Invalid authentication code.' });
		}

		// Delete the 2FA record and clear the flag
		await db.delete(twoFactor).where(eq(twoFactor.id, tfRecord.id));
		await db.update(users).set({ twoFactorEnabled: false }).where(eq(users.id, locals.user.id));

		return { totpDisabled: true };
	}
};
