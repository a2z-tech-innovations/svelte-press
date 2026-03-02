import { describe, it, expect } from 'vitest';
import { buildCsv } from '$lib/server/forms/index.js';
import type { FormField } from '$lib/types/index.js';

describe('buildCsv', () => {
	const fields: FormField[] = [
		{ id: 'name', type: 'text', label: 'Full Name', required: true },
		{ id: 'email', type: 'email', label: 'Email', required: true }
	];

	function makeSub(id: number, data: Record<string, unknown>) {
		return {
			id,
			formId: 1,
			data,
			ipAddress: '127.0.0.1',
			userAgent: 'Test',
			status: 'read' as const,
			createdAt: new Date('2025-01-01T12:00:00Z')
		};
	}

	it('generates header row with field labels', () => {
		const csv = buildCsv([makeSub(1, { name: 'Alice', email: 'alice@example.com' })], fields);
		const lines = csv.split('\n');
		expect(lines[0]).toContain('Full Name');
		expect(lines[0]).toContain('Email');
	});

	it('generates data row', () => {
		const csv = buildCsv([makeSub(1, { name: 'Alice', email: 'alice@example.com' })], fields);
		const lines = csv.split('\n');
		expect(lines[1]).toContain('Alice');
		expect(lines[1]).toContain('alice@example.com');
	});

	it('escapes commas in values', () => {
		const csv = buildCsv([makeSub(1, { name: 'Smith, John', email: 'j@e.com' })], fields);
		expect(csv).toContain('"Smith, John"');
	});

	it('escapes double quotes in values', () => {
		const csv = buildCsv([makeSub(1, { name: 'Say "Hi"', email: 'j@e.com' })], fields);
		expect(csv).toContain('"Say ""Hi"""');
	});

	it('handles 10 submissions', () => {
		const subs = Array.from({ length: 10 }, (_, i) =>
			makeSub(i + 1, { name: `User ${i}`, email: `user${i}@test.com` })
		);
		const csv = buildCsv(subs, fields);
		const lines = csv.split('\n');
		expect(lines.length).toBe(11); // header + 10 rows
	});

	it('handles empty submissions', () => {
		const csv = buildCsv([], fields);
		const lines = csv.split('\n');
		expect(lines.length).toBe(1); // header only
	});

	it('includes ID, Date, Status columns', () => {
		const csv = buildCsv([makeSub(42, { name: 'Bob', email: 'b@b.com' })], fields);
		const header = csv.split('\n')[0];
		expect(header).toContain('ID');
		expect(header).toContain('Date');
		expect(header).toContain('Status');
		const dataRow = csv.split('\n')[1];
		expect(dataRow).toContain('42');
		expect(dataRow).toContain('read');
	});
});
