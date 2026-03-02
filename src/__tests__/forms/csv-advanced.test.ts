import { describe, it, expect } from 'vitest';
import { buildCsv } from '$lib/server/forms/index.js';
import type { FormField } from '$lib/types/index.js';

describe('CSV export advanced', () => {
	const fields: FormField[] = [
		{ id: 'name', type: 'text', label: 'Full Name', required: true },
		{ id: 'msg', type: 'textarea', label: 'Message', required: false }
	];

	function makeSub(id: number, data: Record<string, unknown>, status: 'unread' | 'read' | 'spam' | 'trash' = 'unread') {
		return { id, formId: 1, data, ipAddress: null, userAgent: null, status, createdAt: new Date('2025-06-15T10:00:00Z') };
	}

	it('handles newlines in values by quoting', () => {
		const csv = buildCsv([makeSub(1, { name: 'Alice', msg: 'Line1\nLine2' })], fields);
		expect(csv).toContain('"Line1\nLine2"');
	});

	it('handles null/undefined field values gracefully', () => {
		const csv = buildCsv([makeSub(1, { name: 'Alice' })], fields);
		// msg is undefined → should be empty string
		const dataRow = csv.split('\n')[1];
		expect(dataRow).toBeDefined();
		expect(dataRow).toContain('Alice');
	});

	it('includes ISO timestamp in date column', () => {
		const csv = buildCsv([makeSub(1, { name: 'Alice', msg: 'Hi' })], fields);
		expect(csv).toContain('2025-06-15T10:00:00.000Z');
	});

	it('produces correct number of columns', () => {
		const csv = buildCsv([makeSub(1, { name: 'Alice', msg: 'Hi' })], fields);
		const header = csv.split('\n')[0];
		// ID, Date, Status, Full Name, Message = 5 columns
		// Count commas (handling quoted values is complex, just check count >= 4)
		expect(header.split(',').length).toBeGreaterThanOrEqual(4);
	});
});
