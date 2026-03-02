import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { formSubmissions, forms } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import type { FormField } from '$lib/types/index.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) redirect(302, '/sp-login');
	const id = Number(params.id);
	if (!id) error(404, 'Submission not found');

	const row = db
		.select({
			id: formSubmissions.id,
			formId: formSubmissions.formId,
			formTitle: forms.title,
			formFields: forms.fields,
			data: formSubmissions.data,
			status: formSubmissions.status,
			ipAddress: formSubmissions.ipAddress,
			userAgent: formSubmissions.userAgent,
			createdAt: formSubmissions.createdAt
		})
		.from(formSubmissions)
		.leftJoin(forms, eq(formSubmissions.formId, forms.id))
		.where(eq(formSubmissions.id, id))
		.get();

	if (!row) error(404, 'Submission not found');

	// Auto-mark as read
	if (row.status === 'unread') {
		await db.update(formSubmissions).set({ status: 'read' }).where(eq(formSubmissions.id, id));
	}

	return {
		submission: {
			...row,
			formFields: (row.formFields as unknown as FormField[]) ?? [],
			status: row.status === 'unread' ? ('read' as const) : row.status
		}
	};
};

export const actions: Actions = {
	updateStatus: async ({ params, request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const id = Number(params.id);
		const data = await request.formData();
		const status = String(data.get('status')) as 'unread' | 'read' | 'spam' | 'trash';
		await db.update(formSubmissions).set({ status }).where(eq(formSubmissions.id, id));
		return { success: true };
	},

	delete: async ({ params, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const id = Number(params.id);
		await db.delete(formSubmissions).where(eq(formSubmissions.id, id));
		redirect(302, '/sp-admin/form-submissions');
	}
};
