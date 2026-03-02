import { describe, it, expect } from 'vitest';
import { generateZodSchema, buildCsv } from '$lib/server/forms/index.js';
import type { FormField } from '$lib/types/index.js';

describe('Edge cases', () => {
	it('generates schema with zero fields (only honeypot)', () => {
		const schema = generateZodSchema([]);
		const shape = schema.shape as Record<string, unknown>;
		expect(Object.keys(shape)).toEqual(['_honeypot']);
	});

	it('handles form with all field types', () => {
		const fields: FormField[] = [
			{ id: 'f1', type: 'text', label: 'Text', required: false },
			{ id: 'f2', type: 'email', label: 'Email', required: false },
			{ id: 'f3', type: 'textarea', label: 'Textarea', required: false },
			{ id: 'f4', type: 'select', label: 'Select', required: false, options: ['A', 'B'] },
			{ id: 'f5', type: 'checkbox', label: 'Check', required: false },
			{ id: 'f6', type: 'radio', label: 'Radio', required: false, options: ['X', 'Y'] },
			{ id: 'f7', type: 'number', label: 'Number', required: false },
			{ id: 'f8', type: 'phone', label: 'Phone', required: false },
			{ id: 'f9', type: 'url', label: 'URL', required: false },
			{ id: 'f10', type: 'date', label: 'Date', required: false },
			{ id: 'f11', type: 'hidden', label: 'Hidden', required: false }
		];
		const schema = generateZodSchema(fields);
		const result = schema.safeParse({});
		expect(result.success).toBe(true);
	});

	it('buildCsv with no fields uses empty columns', () => {
		const subs = [{ id: 1, formId: 1, data: { x: 'y' }, ipAddress: null, userAgent: null, status: 'unread' as const, createdAt: new Date() }];
		const csv = buildCsv(subs, []);
		const header = csv.split('\n')[0];
		expect(header).toContain('ID');
		expect(header).toContain('Status');
	});

	it('missing optional fields do not fail schema validation', () => {
		const schema = generateZodSchema([
			{ id: 'opt1', type: 'text', label: 'Opt1', required: false },
			{ id: 'req1', type: 'text', label: 'Req1', required: true }
		]);
		const result = schema.safeParse({ req1: 'hello' });
		expect(result.success).toBe(true);
	});

	it('number field with min/max range', () => {
		const schema = generateZodSchema([
			{ id: 'age', type: 'number', label: 'Age', required: true, validation: { min: 18, max: 120 } }
		]);
		expect(schema.safeParse({ age: 25 }).success).toBe(true);
		expect(schema.safeParse({ age: 15 }).success).toBe(false);
		expect(schema.safeParse({ age: 130 }).success).toBe(false);
	});
});
