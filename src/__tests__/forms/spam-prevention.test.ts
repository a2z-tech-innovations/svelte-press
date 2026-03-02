import { describe, it, expect } from 'vitest';
import { generateZodSchema } from '$lib/server/forms/index.js';

describe('Spam prevention — honeypot', () => {
	it('rejects non-empty honeypot', () => {
		const schema = generateZodSchema([]);
		const result = schema.safeParse({ _honeypot: 'bot-content' });
		expect(result.success).toBe(false);
	});

	it('accepts empty string honeypot', () => {
		const schema = generateZodSchema([]);
		const result = schema.safeParse({ _honeypot: '' });
		expect(result.success).toBe(true);
	});

	it('accepts missing honeypot (defaults to empty)', () => {
		const schema = generateZodSchema([]);
		const result = schema.safeParse({});
		expect(result.success).toBe(true);
	});
});
