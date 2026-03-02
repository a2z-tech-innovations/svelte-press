import { describe, it, expect } from 'vitest';
import { generateZodSchema } from '$lib/server/forms/index.js';
import type { FormField } from '$lib/types/index.js';

describe('generateZodSchema', () => {
	it('accepts valid email for email field', () => {
		const schema = generateZodSchema([
			{ id: 'email', type: 'email', label: 'Email', required: true }
		]);
		const result = schema.safeParse({ email: 'test@example.com' });
		expect(result.success).toBe(true);
	});

	it('rejects invalid email', () => {
		const schema = generateZodSchema([
			{ id: 'email', type: 'email', label: 'Email', required: true }
		]);
		const result = schema.safeParse({ email: 'not-an-email' });
		expect(result.success).toBe(false);
	});

	it('accepts valid URL for url field', () => {
		const schema = generateZodSchema([
			{ id: 'website', type: 'url', label: 'Website', required: false }
		]);
		const result = schema.safeParse({ website: 'https://example.com' });
		expect(result.success).toBe(true);
	});

	it('rejects invalid URL', () => {
		const schema = generateZodSchema([
			{ id: 'website', type: 'url', label: 'Website', required: true }
		]);
		const result = schema.safeParse({ website: 'not-a-url' });
		expect(result.success).toBe(false);
	});

	it('coerces number for number field', () => {
		const schema = generateZodSchema([
			{ id: 'age', type: 'number', label: 'Age', required: true }
		]);
		const result = schema.safeParse({ age: '25' });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.age).toBe(25);
	});

	it('rejects empty required text field', () => {
		const schema = generateZodSchema([
			{ id: 'name', type: 'text', label: 'Name', required: true }
		]);
		const result = schema.safeParse({ name: '' });
		expect(result.success).toBe(false);
	});

	it('accepts empty optional text field', () => {
		const schema = generateZodSchema([
			{ id: 'nickname', type: 'text', label: 'Nickname', required: false }
		]);
		const result = schema.safeParse({});
		expect(result.success).toBe(true);
	});

	it('enforces minLength', () => {
		const schema = generateZodSchema([
			{ id: 'bio', type: 'textarea', label: 'Bio', required: true, validation: { minLength: 10 } }
		]);
		const result = schema.safeParse({ bio: 'short' });
		expect(result.success).toBe(false);
	});

	it('enforces maxLength', () => {
		const schema = generateZodSchema([
			{ id: 'title', type: 'text', label: 'Title', required: true, validation: { maxLength: 5 } }
		]);
		const result = schema.safeParse({ title: 'toolongstring' });
		expect(result.success).toBe(false);
	});

	it('always includes _honeypot field', () => {
		const schema = generateZodSchema([]);
		expect((schema.shape as Record<string, unknown>)['_honeypot']).toBeDefined();
	});

	it('skips hidden fields in validation', () => {
		const schema = generateZodSchema([
			{ id: 'secret', type: 'hidden', label: 'Secret', required: true, defaultValue: 'x' }
		]);
		// hidden fields should not be in schema
		expect((schema.shape as Record<string, unknown>)['secret']).toBeUndefined();
	});
});
