import { describe, it, expect } from 'vitest';
import type { FormField, FormSettings, FormConfig, FormFieldType } from '$lib/types/index.js';

describe('Form types', () => {
	it('FormField supports all 12 field types', () => {
		const types: FormFieldType[] = [
			'text', 'email', 'textarea', 'select', 'checkbox', 'radio',
			'number', 'phone', 'url', 'date', 'file', 'hidden'
		];
		expect(types.length).toBe(12);
		// Each should be usable as a FormField type
		types.forEach(type => {
			const field: FormField = { id: 'x', type, label: 'Test', required: false };
			expect(field.type).toBe(type);
		});
	});

	it('FormSettings has all required properties', () => {
		const settings: FormSettings = {
			submitLabel: 'Send',
			successMessage: 'Thank you!',
			emailNotification: false
		};
		expect(settings.submitLabel).toBe('Send');
		expect(settings.emailNotification).toBe(false);
	});

	it('FormSettings supports optional notificationEmail', () => {
		const settings: FormSettings = {
			submitLabel: 'Submit',
			successMessage: 'Done',
			emailNotification: true,
			notificationEmail: 'admin@example.com'
		};
		expect(settings.notificationEmail).toBe('admin@example.com');
	});

	it('FormConfig bundles all parts', () => {
		const config: FormConfig = {
			nodeId: 'abc123',
			title: 'Contact Form',
			fields: [{ id: 'f1', type: 'text', label: 'Name', required: true }],
			settings: { submitLabel: 'Send', successMessage: 'Thanks', emailNotification: false }
		};
		expect(config.nodeId).toBe('abc123');
		expect(config.fields.length).toBe(1);
	});

	it('FormField validation object is fully optional', () => {
		const field: FormField = { id: 'f', type: 'text', label: 'F', required: false };
		expect(field.validation).toBeUndefined();
	});

	it('FormField validation accepts all sub-properties', () => {
		const field: FormField = {
			id: 'f',
			type: 'text',
			label: 'F',
			required: true,
			validation: {
				minLength: 1,
				maxLength: 100,
				min: 0,
				max: 999,
				pattern: '^[a-z]+$',
				accept: 'image/*',
				maxSize: 1048576
			}
		};
		expect(field.validation?.maxSize).toBe(1048576);
	});
});
