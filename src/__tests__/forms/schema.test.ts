import { describe, it, expect } from 'vitest';
import { getTableName } from 'drizzle-orm';
import { forms, formSubmissions } from '$lib/server/db/schema.js';

describe('DB Schema — forms tables', () => {
	it('exports forms table', () => {
		expect(forms).toBeDefined();
		expect(getTableName(forms)).toBe('forms');
	});

	it('exports formSubmissions table', () => {
		expect(formSubmissions).toBeDefined();
		expect(getTableName(formSubmissions)).toBe('form_submissions');
	});

	it('forms has required columns', () => {
		expect(forms.nodeId).toBeDefined();
		expect(forms.title).toBeDefined();
		expect(forms.fields).toBeDefined();
		expect(forms.settings).toBeDefined();
		expect(forms.createdAt).toBeDefined();
	});

	it('formSubmissions has required columns', () => {
		expect(formSubmissions.formId).toBeDefined();
		expect(formSubmissions.data).toBeDefined();
		expect(formSubmissions.status).toBeDefined();
		expect(formSubmissions.ipAddress).toBeDefined();
	});
});
