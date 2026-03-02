import * as z from 'zod';
import { db } from '$lib/server/db/index.js';
import { forms, formSubmissions } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import type { FormField, FormSettings, FormConfig } from '$lib/types/index.js';

export type { FormField, FormSettings, FormConfig };

export function generateZodSchema(fields: FormField[]) {
	const shape: Record<string, z.ZodTypeAny> = {};

	for (const field of fields) {
		if (field.type === 'hidden') continue;

		const minLen = field.validation?.minLength;
		const maxLen = field.validation?.maxLength;

		let s: z.ZodTypeAny;

		if (field.type === 'number') {
			let n = z.coerce.number();
			if (field.validation?.min !== undefined) n = n.gte(field.validation.min);
			if (field.validation?.max !== undefined) n = n.lte(field.validation.max);
			s = field.required ? n : (n.optional() as unknown as z.ZodTypeAny);
		} else if (field.type === 'checkbox') {
			s = z.string().optional().default('');
		} else {
			let str = z.string();
			if (field.type === 'email') str = str.email('Please enter a valid email');
			if (field.type === 'url') str = str.url('Please enter a valid URL');
			if (minLen) str = str.min(minLen);
			if (maxLen) str = str.max(maxLen);
			if (field.required) str = str.min(1, `${field.label} is required`);
			s = field.required ? str : (str.optional() as unknown as z.ZodTypeAny);
		}

		shape[field.id] = s;
	}

	// Honeypot — must be empty (bot detection)
	shape['_honeypot'] = z.string().max(0, 'Bot detected').optional().default('');

	return z.object(shape);
}

export async function syncFormToDb(
	postId: number | null,
	nodeId: string,
	title: string,
	fields: FormField[],
	settings: FormSettings
): Promise<void> {
	const existing = db
		.select({ id: forms.id })
		.from(forms)
		.where(eq(forms.nodeId, nodeId))
		.get();

	if (existing) {
		await db
			.update(forms)
			.set({
				postId,
				title,
				fields: fields as unknown as Record<string, unknown>[],
				settings: settings as unknown as Record<string, unknown>,
				updatedAt: new Date()
			})
			.where(eq(forms.id, existing.id));
	} else {
		await db.insert(forms).values({
			nodeId,
			postId,
			title,
			fields: fields as unknown as Record<string, unknown>[],
			settings: settings as unknown as Record<string, unknown>
		});
	}
}

export function getFormByNodeId(nodeId: string): FormConfig | null {
	const row = db.select().from(forms).where(eq(forms.nodeId, nodeId)).get();
	if (!row) return null;
	return {
		nodeId: row.nodeId,
		title: row.title,
		fields: (row.fields as unknown as FormField[]) ?? [],
		settings: (row.settings as unknown as FormSettings) ?? {
			submitLabel: 'Send',
			successMessage: 'Thank you for your submission!',
			emailNotification: false
		}
	};
}

export function getFormById(id: number): (typeof forms.$inferSelect) | null {
	return db.select().from(forms).where(eq(forms.id, id)).get() ?? null;
}

export function buildCsv(
	submissions: (typeof formSubmissions.$inferSelect)[],
	fields: FormField[]
): string {
	const fieldIds = fields.map((f) => f.id);
	const fieldLabels = fields.map((f) => f.label);

	const escapeCell = (val: unknown): string => {
		const s = String(val ?? '');
		if (s.includes(',') || s.includes('"') || s.includes('\n')) {
			return '"' + s.replace(/"/g, '""') + '"';
		}
		return s;
	};

	const header = ['ID', 'Date', 'Status', ...fieldLabels].map(escapeCell).join(',');

	const rows = submissions.map((sub) => {
		const subData = (sub.data as Record<string, unknown>) ?? {};
		const cells = [
			sub.id,
			sub.createdAt ? new Date(sub.createdAt).toISOString() : '',
			sub.status,
			...fieldIds.map((id) => subData[id] ?? '')
		];
		return cells.map(escapeCell).join(',');
	});

	return [header, ...rows].join('\n');
}
