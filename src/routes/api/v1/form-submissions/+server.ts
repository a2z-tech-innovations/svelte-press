import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { forms, formSubmissions } from '$lib/server/db/schema.js';
import { eq, desc, and, count, sql } from 'drizzle-orm';
import { requireCapability } from '$lib/server/api/auth.js';
import { generateZodSchema, buildCsv } from '$lib/server/forms/index.js';
import { logActivity } from '$lib/server/activity/index.js';
import type { FormField } from '$lib/types/index.js';

export const GET: RequestHandler = async (event) => {
	const authError = requireCapability(event, 'manage_options');
	if (authError) return authError;

	const url = event.url;
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
	const formId = (url.searchParams.get('formId') ?? url.searchParams.get('form'))
		? Number(url.searchParams.get('formId') ?? url.searchParams.get('form'))
		: null;
	const status = url.searchParams.get('status') ?? '';
	const exportCsv = url.searchParams.get('export') === 'csv';
	const perPage = 20;
	const offset = (page - 1) * perPage;

	const conditions: ReturnType<typeof eq>[] = [];
	if (formId) conditions.push(eq(formSubmissions.formId, formId));
	if (status && ['unread', 'read', 'spam', 'trash'].includes(status)) {
		conditions.push(eq(formSubmissions.status, status as 'unread' | 'read' | 'spam' | 'trash'));
	}
	const whereClause = conditions.length ? and(...conditions) : sql`1=1`;

	if (exportCsv) {
		const allSubs = db
			.select({
				id: formSubmissions.id,
				formId: formSubmissions.formId,
				data: formSubmissions.data,
				status: formSubmissions.status,
				ipAddress: formSubmissions.ipAddress,
				userAgent: formSubmissions.userAgent,
				createdAt: formSubmissions.createdAt
			})
			.from(formSubmissions)
			.where(whereClause)
			.orderBy(desc(formSubmissions.createdAt))
			.all();
		let fields: FormField[] = [];
		if (formId) {
			// Single-form export: use that form's field schema for column headers
			const formRow = db.select({ fields: forms.fields }).from(forms).where(eq(forms.id, formId)).get();
			fields = (formRow?.fields as unknown as FormField[]) ?? [];
		} else {
			// All-forms export: derive field columns from union of all data keys
			const dataKeys = new Set<string>();
			for (const sub of allSubs) {
				const d = (sub.data as Record<string, unknown>) ?? {};
				for (const k of Object.keys(d)) {
					if (!k.startsWith('_')) dataKeys.add(k);
				}
			}
			fields = Array.from(dataKeys).map((k) => ({
				id: k,
				type: 'text' as const,
				label: k,
				required: false
			}));
		}
		const csv = buildCsv(allSubs as Parameters<typeof buildCsv>[0], fields);
		return new Response(csv, {
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': `attachment; filename="submissions.csv"`
			}
		});
	}

	const rows = db.select({
		id: formSubmissions.id,
		formId: formSubmissions.formId,
		formTitle: forms.title,
		data: formSubmissions.data,
		status: formSubmissions.status,
		ipAddress: formSubmissions.ipAddress,
		createdAt: formSubmissions.createdAt
	}).from(formSubmissions)
		.leftJoin(forms, eq(formSubmissions.formId, forms.id))
		.where(whereClause)
		.orderBy(desc(formSubmissions.createdAt))
		.limit(perPage)
		.offset(offset)
		.all();

	const [{ count: total }] = db.select({ count: count() }).from(formSubmissions).where(whereClause).all();

	return json({ submissions: rows, total, page, perPage, totalPages: Math.ceil(total / perPage) });
};

export const POST: RequestHandler = async (event) => {
	// Public endpoint - no auth required for form submission
	const body = await event.request.json();
	const { nodeId, ...fieldData } = body as { nodeId: string; [key: string]: unknown };

	if (!nodeId) return json({ error: 'nodeId is required' }, { status: 400 });

	const formRow = db.select().from(forms).where(eq(forms.nodeId, nodeId)).get();
	if (!formRow) return json({ error: 'Form not found' }, { status: 404 });

	const fields = (formRow.fields as unknown as FormField[]) ?? [];
	const schema = generateZodSchema(fields);

	const honeypot = String(fieldData['_honeypot'] ?? '');
	if (honeypot.length > 0) {
		return json({ success: true }); // Silently succeed for bots
	}

	const parsed = schema.safeParse(fieldData);
	if (!parsed.success) {
		const errors = parsed.error.flatten().fieldErrors;
		return json({ errors }, { status: 422 });
	}

	const ipAddress = event.getClientAddress();
	const userAgent = event.request.headers.get('user-agent') ?? '';

	const [submission] = await db.insert(formSubmissions).values({
		formId: formRow.id,
		data: parsed.data as Record<string, unknown>,
		ipAddress,
		userAgent,
		status: 'unread'
	}).returning();

	logActivity({
		action: 'form_submitted',
		objectType: 'form',
		objectId: formRow.id,
		objectTitle: formRow.title
	}).catch(() => {});

	return json({ success: true, id: submission.id });
};
