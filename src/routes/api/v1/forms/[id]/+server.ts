import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { forms } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { requireCapability } from '$lib/server/api/auth.js';
import type { FormField, FormSettings } from '$lib/types/index.js';

export const GET: RequestHandler = async (event) => {
	const authError = requireCapability(event, 'manage_options');
	if (authError) return authError;

	const id = Number(event.params.id);
	const row = db.select().from(forms).where(eq(forms.id, id)).get();
	if (!row) return json({ error: 'Not found' }, { status: 404 });
	return json(row);
};

export const PUT: RequestHandler = async (event) => {
	const authError = requireCapability(event, 'edit_posts');
	if (authError) return authError;

	const id = Number(event.params.id);
	const body = await event.request.json();

	const existing = db.select({ id: forms.id }).from(forms).where(eq(forms.id, id)).get();
	if (!existing) return json({ error: 'Not found' }, { status: 404 });

	await db.update(forms).set({
		title: body.title,
		fields: body.fields as FormField[] as unknown as Record<string, unknown>[],
		settings: body.settings as FormSettings as unknown as Record<string, unknown>,
		updatedAt: new Date()
	}).where(eq(forms.id, id));

	const updated = db.select().from(forms).where(eq(forms.id, id)).get();
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	const authError = requireCapability(event, 'edit_posts');
	if (authError) return authError;

	const id = Number(event.params.id);
	const existing = db.select({ id: forms.id }).from(forms).where(eq(forms.id, id)).get();
	if (!existing) return json({ error: 'Not found' }, { status: 404 });

	await db.delete(forms).where(eq(forms.id, id));
	return json({ deleted: true });
};
