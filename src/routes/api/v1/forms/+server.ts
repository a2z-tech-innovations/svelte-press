import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { forms, formSubmissions } from '$lib/server/db/schema.js';
import { eq, count } from 'drizzle-orm';
import { requireCapability } from '$lib/server/api/auth.js';
import { syncFormToDb } from '$lib/server/forms/index.js';
import type { FormField, FormSettings } from '$lib/types/index.js';

export const GET: RequestHandler = async (event) => {
	const authError = requireCapability(event, 'manage_options');
	if (authError) return authError;

	const rows = db.select({
		id: forms.id,
		nodeId: forms.nodeId,
		postId: forms.postId,
		title: forms.title,
		createdAt: forms.createdAt
	}).from(forms).all();

	const result = rows.map((r) => {
		const [{ count: submissionCount }] = db.select({ count: count() }).from(formSubmissions).where(eq(formSubmissions.formId, r.id)).all();
		return { ...r, submissionCount };
	});

	return json({ forms: result });
};

export const POST: RequestHandler = async (event) => {
	const authError = requireCapability(event, 'edit_posts');
	if (authError) return authError;

	const body = await event.request.json();
	const { nodeId, postId, title, fields, settings } = body as {
		nodeId: string;
		postId: number | null;
		title: string;
		fields: FormField[];
		settings: FormSettings;
	};

	if (!nodeId) return json({ error: 'nodeId is required' }, { status: 400 });

	await syncFormToDb(postId ?? null, nodeId, title ?? '', fields ?? [], settings ?? { submitLabel: 'Send', successMessage: 'Thank you!', emailNotification: false });

	const row = db.select().from(forms).where(eq(forms.nodeId, nodeId)).get();
	return json(row, { status: 201 });
};
