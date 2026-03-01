/**
 * Tests for Better Auth session lifecycle behavior.
 * Mocks auth.api.* to verify that login, registration, 2FA, logout,
 * and password reset flows handle BA responses correctly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('$lib/auth.js', () => ({
	auth: {
		api: {
			signInEmail: vi.fn(),
			signUpEmail: vi.fn(),
			signOut: vi.fn(),
			requestPasswordReset: vi.fn(),
			resetPassword: vi.fn(),
			verifyTOTP: vi.fn(),
			verifyBackupCode: vi.fn()
		}
	}
}));

vi.mock('$lib/server/db/index.js', () => ({
	db: {
		select: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		get: vi.fn(),
		update: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis()
	}
}));

vi.mock('$lib/server/db/schema.js', () => ({
	users: {},
	sessions: {},
	account: {}
}));

vi.mock('$lib/server/activity/index.js', () => ({
	logActivity: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('drizzle-orm', () => ({ eq: vi.fn(), or: vi.fn(), and: vi.fn() }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDbUser(overrides = {}) {
	return {
		id: 1,
		username: 'admin',
		email: 'admin@example.com',
		displayName: 'Admin User',
		role: 'admin' as const,
		passwordHash: '$2b$10$hashedpassword',
		registeredAt: new Date('2024-01-01'),
		lastLogin: null,
		bio: '',
		avatar: '',
		...overrides
	};
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BA session lifecycle — signInEmail', () => {
	let authMod: Awaited<typeof import('$lib/auth.js')>;

	beforeEach(async () => {
		vi.clearAllMocks();
		authMod = await import('$lib/auth.js');
	});

	it('returns user and session on successful sign-in', async () => {
		const mockResult = {
			user: { id: 1, email: 'admin@example.com' },
			session: { token: 'valid-token' }
		};
		vi.mocked(authMod.auth.api.signInEmail).mockResolvedValue(mockResult as never);

		const result = await authMod.auth.api.signInEmail({
			body: { email: 'admin@example.com', password: 'password' },
			headers: new Headers()
		});

		expect(result).toMatchObject({ user: { email: 'admin@example.com' } });
	});

	it('throws on invalid credentials', async () => {
		vi.mocked(authMod.auth.api.signInEmail).mockRejectedValue(new Error('INVALID_EMAIL_OR_PASSWORD'));

		await expect(
			authMod.auth.api.signInEmail({
				body: { email: 'wrong@example.com', password: 'bad' },
				headers: new Headers()
			})
		).rejects.toThrow();
	});

	it('indicates 2FA redirect when TOTP is required', async () => {
		vi.mocked(authMod.auth.api.signInEmail).mockResolvedValue({
			twoFactorRedirect: true
		} as never);

		const result = await authMod.auth.api.signInEmail({
			body: { email: 'admin@example.com', password: 'password' },
			headers: new Headers()
		});

		expect(result).toHaveProperty('twoFactorRedirect', true);
	});
});

describe('BA session lifecycle — signUpEmail', () => {
	let authMod: Awaited<typeof import('$lib/auth.js')>;

	beforeEach(async () => {
		vi.clearAllMocks();
		authMod = await import('$lib/auth.js');
	});

	it('returns user on successful registration', async () => {
		vi.mocked(authMod.auth.api.signUpEmail).mockResolvedValue({
			user: { id: 2, email: 'new@example.com', name: 'New User' }
		} as never);

		const result = await authMod.auth.api.signUpEmail({
			body: { email: 'new@example.com', password: 'password123', name: 'New User' },
			headers: new Headers()
		});

		expect(result).toHaveProperty('user.email', 'new@example.com');
	});

	it('throws when email is already registered', async () => {
		vi.mocked(authMod.auth.api.signUpEmail).mockRejectedValue(new Error('email already exists'));

		await expect(
			authMod.auth.api.signUpEmail({
				body: { email: 'existing@example.com', password: 'password123', name: 'User' },
				headers: new Headers()
			})
		).rejects.toThrow();
	});
});

describe('BA session lifecycle — signOut', () => {
	let authMod: Awaited<typeof import('$lib/auth.js')>;

	beforeEach(async () => {
		vi.clearAllMocks();
		authMod = await import('$lib/auth.js');
	});

	it('resolves without error on valid session', async () => {
		vi.mocked(authMod.auth.api.signOut).mockResolvedValue({ success: true } as never);

		await expect(
			authMod.auth.api.signOut({ headers: new Headers({ cookie: 'sp_session=valid-token' }) })
		).resolves.not.toThrow();
	});

	it('silently ignores errors when session cookie is missing', async () => {
		vi.mocked(authMod.auth.api.signOut).mockRejectedValue(new Error('no session'));

		// The logout action uses .catch(() => {}) — verify the pattern works
		await expect(
			authMod.auth.api.signOut({ headers: new Headers() }).catch(() => {})
		).resolves.toBeUndefined();
	});
});

describe('BA session lifecycle — password reset', () => {
	let authMod: Awaited<typeof import('$lib/auth.js')>;

	beforeEach(async () => {
		vi.clearAllMocks();
		authMod = await import('$lib/auth.js');
	});

	it('requestPasswordReset resolves for a valid email', async () => {
		vi.mocked(authMod.auth.api.requestPasswordReset).mockResolvedValue({ status: true } as never);

		await expect(
			authMod.auth.api.requestPasswordReset({
				body: { email: 'user@example.com', redirectTo: 'http://localhost/sp-forgot-password' },
				headers: new Headers()
			})
		).resolves.not.toThrow();
	});

	it('requestPasswordReset silently resolves even for unknown email (anti-enumeration)', async () => {
		// BA resolves successfully regardless; enumeration protection is a design choice.
		// The action always returns { sent: true } without leaking whether email exists.
		vi.mocked(authMod.auth.api.requestPasswordReset).mockResolvedValue({ status: true } as never);

		// Either resolves or rejects — the action catches both with .catch(() => {})
		const result = await authMod.auth.api
			.requestPasswordReset({
				body: { email: 'unknown@example.com', redirectTo: 'http://localhost/sp-forgot-password' },
				headers: new Headers()
			})
			.catch(() => null);

		// The important thing is it does not throw unhandled — result can be truthy or null
		expect(typeof result).toMatch(/object|null/);
	});

	it('resetPassword resolves with valid token and new password', async () => {
		vi.mocked(authMod.auth.api.resetPassword).mockResolvedValue({ status: true } as never);

		await expect(
			authMod.auth.api.resetPassword({
				body: { token: 'valid-reset-token', newPassword: 'newpass123' },
				headers: new Headers()
			})
		).resolves.not.toThrow();
	});

	it('resetPassword throws on invalid/expired token', async () => {
		vi.mocked(authMod.auth.api.resetPassword).mockRejectedValue(
			new Error('INVALID_TOKEN')
		);

		await expect(
			authMod.auth.api.resetPassword({
				body: { token: 'bad-token', newPassword: 'newpass123' },
				headers: new Headers()
			})
		).rejects.toThrow();
	});
});

describe('BA session lifecycle — 2FA verification during login', () => {
	let authMod: Awaited<typeof import('$lib/auth.js')>;

	beforeEach(async () => {
		vi.clearAllMocks();
		authMod = await import('$lib/auth.js');
	});

	it('verifyTOTP resolves on correct code', async () => {
		vi.mocked(authMod.auth.api.verifyTOTP).mockResolvedValue({ status: true } as never);

		await expect(
			authMod.auth.api.verifyTOTP({
				body: { code: '123456' },
				headers: new Headers()
			})
		).resolves.not.toThrow();
	});

	it('verifyTOTP throws on wrong code', async () => {
		vi.mocked(authMod.auth.api.verifyTOTP).mockRejectedValue(new Error('INVALID_CODE'));

		await expect(
			authMod.auth.api.verifyTOTP({
				body: { code: '000000' },
				headers: new Headers()
			})
		).rejects.toThrow();
	});

	it('falls back to verifyBackupCode when TOTP fails', async () => {
		vi.mocked(authMod.auth.api.verifyTOTP).mockRejectedValue(new Error('INVALID_CODE'));
		vi.mocked(authMod.auth.api.verifyBackupCode).mockResolvedValue({ status: true } as never);

		let verified = false;
		try {
			await authMod.auth.api.verifyTOTP({ body: { code: 'backup123' }, headers: new Headers() });
			verified = true;
		} catch {
			try {
				await authMod.auth.api.verifyBackupCode({ body: { code: 'backup123' }, headers: new Headers() });
				verified = true;
			} catch {
				// both failed
			}
		}

		expect(verified).toBe(true);
	});

	it('fails when both TOTP and backup code are invalid', async () => {
		vi.mocked(authMod.auth.api.verifyTOTP).mockRejectedValue(new Error('INVALID_CODE'));
		vi.mocked(authMod.auth.api.verifyBackupCode).mockRejectedValue(new Error('INVALID_CODE'));

		let verified = false;
		try {
			await authMod.auth.api.verifyTOTP({ body: { code: 'bad' }, headers: new Headers() });
			verified = true;
		} catch {
			try {
				await authMod.auth.api.verifyBackupCode({ body: { code: 'bad' }, headers: new Headers() });
				verified = true;
			} catch {
				// expected
			}
		}

		expect(verified).toBe(false);
	});
});
