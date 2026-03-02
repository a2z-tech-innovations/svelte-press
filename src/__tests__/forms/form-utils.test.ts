import { describe, it, expect } from 'vitest';
import { generateZodSchema } from '$lib/server/forms/index.js';
import type { FormField } from '$lib/types/index.js';

describe('Form utility functions', () => {
	describe('generateZodSchema - type coverage', () => {
		it('phone field treated as text', () => {
			const schema = generateZodSchema([
				{ id: 'phone', type: 'phone', label: 'Phone', required: true }
			]);
			expect(schema.safeParse({ phone: '+1-555-1234' }).success).toBe(true);
		});

		it('date field treated as text', () => {
			const schema = generateZodSchema([
				{ id: 'birthday', type: 'date', label: 'Birthday', required: true }
			]);
			expect(schema.safeParse({ birthday: '2000-01-01' }).success).toBe(true);
		});

		it('select field treated as text', () => {
			const schema = generateZodSchema([
				{ id: 'country', type: 'select', label: 'Country', required: true, options: ['US', 'UK'] }
			]);
			expect(schema.safeParse({ country: 'US' }).success).toBe(true);
		});

		it('radio field treated as text', () => {
			const schema = generateZodSchema([
				{ id: 'size', type: 'radio', label: 'Size', required: true, options: ['S', 'M', 'L'] }
			]);
			expect(schema.safeParse({ size: 'M' }).success).toBe(true);
		});

		it('checkbox optional produces valid parse with empty', () => {
			const schema = generateZodSchema([
				{ id: 'terms', type: 'checkbox', label: 'Terms', required: false }
			]);
			expect(schema.safeParse({}).success).toBe(true);
		});

		it('required email rejects empty string', () => {
			const schema = generateZodSchema([
				{ id: 'email', type: 'email', label: 'Email', required: true }
			]);
			const r = schema.safeParse({ email: '' });
			expect(r.success).toBe(false);
		});
	});

	describe('FormField type guards', () => {
		it('FormField interface accepts all required properties', () => {
			const field: FormField = {
				id: 'test',
				type: 'text',
				label: 'Test Field',
				required: true
			};
			expect(field.id).toBe('test');
			expect(field.type).toBe('text');
		});

		it('FormField accepts optional properties', () => {
			const field: FormField = {
				id: 'test',
				type: 'select',
				label: 'Select Field',
				required: false,
				options: ['A', 'B', 'C'],
				placeholder: 'Choose…',
				validation: { minLength: 1, maxLength: 100 }
			};
			expect(field.options).toHaveLength(3);
			expect(field.validation?.maxLength).toBe(100);
		});
	});
});
