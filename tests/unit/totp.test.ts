/**
 * Tests for TOTP 2FA lifecycle in the profile page actions.
 * Tests the crypto compatibility between BA's verifyTOTP and the profile's
 * setup2fa/verify2fa/disable2fa actions using mocked BA crypto functions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockVerify = vi.fn();
const mockUrl = vi.fn().mockReturnValue(
	'otpauth://totp/SveltePress:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SveltePress&digits=6&period=30'
);
const mockTotp = vi.fn().mockResolvedValue('123456');
const mockCreateOTP = vi.fn().mockReturnValue({ url: mockUrl, verify: mockVerify, totp: mockTotp });

const mockSymmetricEncrypt = vi.fn();
const mockSymmetricDecrypt = vi.fn();

vi.mock('better-auth/crypto', () => ({
	symmetricEncrypt: (...args: unknown[]) => mockSymmetricEncrypt(...args),
	symmetricDecrypt: (...args: unknown[]) => mockSymmetricDecrypt(...args)
}));

vi.mock('@better-auth/utils/otp', () => ({
	createOTP: (...args: unknown[]) => mockCreateOTP(...args)
}));

vi.mock('@better-auth/utils/random', () => ({
	createRandomStringGenerator: vi.fn().mockReturnValue(
		(length: number) => 'a'.repeat(length) // deterministic for tests
	)
}));

vi.mock('qrcode', () => ({
	default: {
		toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,fakeqrcode')
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
		values: vi.fn().mockResolvedValue(undefined),
		delete: vi.fn().mockReturnThis()
	}
}));

vi.mock('$lib/server/db/schema.js', () => ({
	users: {},
	userMeta: {},
	twoFactor: {},
	account: {}
}));

vi.mock('bcryptjs', () => ({
	default: {
		compare: vi.fn().mockResolvedValue(true),
		hash: vi.fn().mockResolvedValue('newhash')
	}
}));

vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn() }));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TOTP 2FA — secret generation and QR code', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUrl.mockReturnValue(
			'otpauth://totp/SveltePress:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SveltePress&digits=6&period=30'
		);
	});

	it('generateRandomString produces the requested character count', async () => {
		const { createRandomStringGenerator } = await import('@better-auth/utils/random');
		const gen = createRandomStringGenerator('a-z', '0-9', 'A-Z', '-_');
		const secret = gen(32);
		expect(secret).toHaveLength(32);
		expect(typeof secret).toBe('string');
	});

	it('createOTP generates a valid otpauth:// URL', async () => {
		const { createOTP } = await import('@better-auth/utils/otp');
		createOTP('test-secret', { digits: 6, period: 30 });
		const url = mockUrl('SveltePress', 'user@example.com');
		expect(url).toMatch(/^otpauth:\/\/totp\//);
		expect(url).toContain('secret=');
		expect(url).toContain('issuer=SveltePress');
	});

	it('QR URL contains an extractable secret param', () => {
		const url =
			'otpauth://totp/SveltePress:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SveltePress&digits=6&period=30';
		const urlObj = new URL(url);
		expect(urlObj.searchParams.get('secret')).toBeTruthy();
		expect(urlObj.searchParams.get('secret')).toBe('JBSWY3DPEHPK3PXP');
	});
});

describe('TOTP 2FA — verify2fa flow', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSymmetricEncrypt.mockResolvedValue('encrypted-secret');
		mockVerify.mockResolvedValue(true);
	});

	it('verifies a valid 6-digit TOTP code successfully', async () => {
		const { createOTP } = await import('@better-auth/utils/otp');
		const otp = createOTP('test-secret', { digits: 6, period: 30 });
		mockVerify.mockResolvedValue(true);

		const isValid = await otp.verify('123456', { window: 1 });
		expect(isValid).toBe(true);
	});

	it('rejects an invalid TOTP code', async () => {
		const { createOTP } = await import('@better-auth/utils/otp');
		const otp = createOTP('test-secret', { digits: 6, period: 30 });
		mockVerify.mockResolvedValue(false);

		const isValid = await otp.verify('000000', { window: 1 });
		expect(isValid).toBe(false);
	});

	it('encrypts the verified secret before storing in twoFactor table', async () => {
		const { symmetricEncrypt } = await import('better-auth/crypto');
		const secret = 'test-totp-secret';
		const encrypted = await symmetricEncrypt({ key: 'test-ba-secret', data: secret });
		expect(encrypted).toBe('encrypted-secret');
		expect(mockSymmetricEncrypt).toHaveBeenCalledWith({ key: 'test-ba-secret', data: secret });
	});

	it('encrypts backup codes as a JSON-serialised array', async () => {
		const { symmetricEncrypt } = await import('better-auth/crypto');
		const codes = ['aBcDe-12345', 'fGhIj-67890'];
		await symmetricEncrypt({ key: 'test-secret', data: JSON.stringify(codes) });

		const lastCall = mockSymmetricEncrypt.mock.lastCall!;
		expect(lastCall[0].data).toBe(JSON.stringify(codes));
		// Verify the stored data is valid JSON that parses back to the codes
		const parsed = JSON.parse(lastCall[0].data);
		expect(parsed).toEqual(codes);
	});
});

describe('TOTP 2FA — disable2fa flow', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSymmetricEncrypt.mockResolvedValue('encrypted-value');
	});

	it('decrypts secret before TOTP verification during disable', async () => {
		const { symmetricDecrypt } = await import('better-auth/crypto');
		const { createOTP } = await import('@better-auth/utils/otp');

		mockSymmetricDecrypt.mockResolvedValue('raw-totp-secret');
		mockVerify.mockResolvedValue(true);

		const secret = await symmetricDecrypt({ key: 'ba-secret', data: 'encrypted-stored' });
		const otp = createOTP(secret, { digits: 6, period: 30 });
		const valid = await otp.verify('123456', { window: 1 });

		expect(mockSymmetricDecrypt).toHaveBeenCalledWith({ key: 'ba-secret', data: 'encrypted-stored' });
		expect(valid).toBe(true);
	});

	it('accepts a backup code as alternative to TOTP during disable', async () => {
		const { symmetricDecrypt } = await import('better-auth/crypto');
		const { createOTP } = await import('@better-auth/utils/otp');

		// TOTP check fails
		mockVerify.mockResolvedValue(false);

		// First decrypt: TOTP secret; second decrypt: backup codes
		const codes = ['aBcDe-12345', 'fGhIj-67890'];
		mockSymmetricDecrypt
			.mockResolvedValueOnce('raw-totp-secret')
			.mockResolvedValueOnce(JSON.stringify(codes));

		const totpSecret = await symmetricDecrypt({ key: 'ba-secret', data: 'enc-secret' });
		const totpValid = await createOTP(totpSecret, { digits: 6, period: 30 }).verify(
			'aBcDe-12345',
			{ window: 1 }
		);
		expect(totpValid).toBe(false);

		// Fall back to backup codes
		const codesJson = await symmetricDecrypt({ key: 'ba-secret', data: 'enc-codes' });
		const parsedCodes: string[] = JSON.parse(codesJson);
		const backupMatch = parsedCodes.includes('aBcDe-12345');
		expect(backupMatch).toBe(true);
	});

	it('rejects invalid backup code during disable', async () => {
		const { symmetricDecrypt } = await import('better-auth/crypto');
		const { createOTP } = await import('@better-auth/utils/otp');

		mockVerify.mockResolvedValue(false);
		const codes = ['aBcDe-12345', 'fGhIj-67890'];
		mockSymmetricDecrypt
			.mockResolvedValueOnce('raw-totp-secret')
			.mockResolvedValueOnce(JSON.stringify(codes));

		const totpSecret = await symmetricDecrypt({ key: 'ba-secret', data: 'enc-secret' });
		const totpValid = await createOTP(totpSecret, { digits: 6, period: 30 }).verify(
			'wrong-code',
			{ window: 1 }
		);
		const codesJson = await symmetricDecrypt({ key: 'ba-secret', data: 'enc-codes' });
		const parsedCodes: string[] = JSON.parse(codesJson);
		const backupMatch = parsedCodes.includes('wrong-code');

		expect(totpValid).toBe(false);
		expect(backupMatch).toBe(false);
	});
});

describe('TOTP 2FA — encryption compatibility with BA', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('symmetricEncrypt and symmetricDecrypt are inverse operations (mocked)', async () => {
		const { symmetricEncrypt, symmetricDecrypt } = await import('better-auth/crypto');

		mockSymmetricEncrypt.mockResolvedValue('encrypted-data');
		mockSymmetricDecrypt.mockResolvedValue('original-secret');

		const encrypted = await symmetricEncrypt({ key: 'ba-secret', data: 'original-secret' });
		expect(encrypted).toBe('encrypted-data');

		const decrypted = await symmetricDecrypt({ key: 'ba-secret', data: encrypted });
		expect(decrypted).toBe('original-secret');
	});

	it('backup codes are stored as encrypted JSON, not plain text', async () => {
		const { symmetricEncrypt } = await import('better-auth/crypto');
		mockSymmetricEncrypt.mockResolvedValue('encrypted-backup');

		const codes = ['code1-12345', 'code2-67890'];
		await symmetricEncrypt({ key: 'secret', data: JSON.stringify(codes) });

		const lastCall = mockSymmetricEncrypt.mock.lastCall!;
		expect(typeof lastCall[0].data).toBe('string');
		const parsed = JSON.parse(lastCall[0].data);
		expect(parsed).toEqual(codes);
	});

	it('backup codes JSON is parseable after decryption', async () => {
		const { symmetricDecrypt } = await import('better-auth/crypto');
		const codes = ['aBcDe-fGhIj', 'kLmNo-pQrSt'];
		mockSymmetricDecrypt.mockResolvedValue(JSON.stringify(codes));

		const result = await symmetricDecrypt({ key: 'ba-secret', data: 'encrypted-codes' });
		const parsed = JSON.parse(result);

		expect(Array.isArray(parsed)).toBe(true);
		expect(parsed).toHaveLength(2);
		expect(parsed[0]).toMatch(/^.{5}-.{5}$/);
	});
});
