import type { PageServerLoad, Actions } from './$types.js';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { forms, formSubmissions } from '$lib/server/db/schema.js';
import { eq, desc, count, and, sql } from 'drizzle-orm';
import { logActivity } from '$lib/server/activity/index.js';

const PER_PAGE = 20;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(302, '/sp-login');

	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
	const statusFilter = url.searchParams.get('status') ?? '';
	const formIdFilter = url.searchParams.get('form') ? Number(url.searchParams.get('form')) : null;
	const offset = (page - 1) * PER_PAGE;

	// Load all forms for filter dropdown
	const allForms = db.select({ id: forms.id, title: forms.title }).from(forms).all();

	// Build where clause — "all" view excludes trash (matching WordPress behaviour)
	const conditions = [];
	if (statusFilter && statusFilter !== 'all') {
		conditions.push(eq(formSubmissions.status, statusFilter as 'unread' | 'read' | 'spam' | 'trash'));
	} else {
		conditions.push(sql`${formSubmissions.status} != 'trash'`);
	}
	if (formIdFilter) {
		conditions.push(eq(formSubmissions.formId, formIdFilter));
	}
	const whereClause = and(...conditions);

	// Status counts
	const allSubs = db
		.select({ status: formSubmissions.status })
		.from(formSubmissions)
		.where(formIdFilter ? eq(formSubmissions.formId, formIdFilter) : undefined)
		.all();
	const counts: Record<string, number> = { all: 0, unread: 0, read: 0, spam: 0, trash: 0 };
	for (const s of allSubs) {
		counts[s.status] = (counts[s.status] ?? 0) + 1;
		if (s.status !== 'trash') counts.all++;
	}

	const submissions = db
		.select({
			id: formSubmissions.id,
			formId: formSubmissions.formId,
			formTitle: forms.title,
			data: formSubmissions.data,
			status: formSubmissions.status,
			ipAddress: formSubmissions.ipAddress,
			createdAt: formSubmissions.createdAt
		})
		.from(formSubmissions)
		.leftJoin(forms, eq(formSubmissions.formId, forms.id))
		.where(whereClause)
		.orderBy(desc(formSubmissions.createdAt))
		.limit(PER_PAGE)
		.offset(offset)
		.all();

	const [{ count: total }] = db.select({ count: count() }).from(formSubmissions).where(whereClause).all();

	return {
		submissions,
		allForms,
		counts,
		total,
		page,
		totalPages: Math.ceil(total / PER_PAGE),
		statusFilter,
		formIdFilter
	};
};

export const actions: Actions = {
	updateStatus: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const data = await request.formData();
		const id = Number(data.get('id'));
		const status = String(data.get('status')) as 'unread' | 'read' | 'spam' | 'trash';
		await db.update(formSubmissions).set({ status }).where(eq(formSubmissions.id, id));
		return { success: true };
	},

	bulkAction: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const data = await request.formData();
		const action = String(data.get('bulkAction'));
		const ids = data.getAll('ids').map(Number).filter(Boolean);
		if (ids.length === 0) return fail(400, { error: 'No items selected.' });

		if (action === 'delete') {
			for (const id of ids) {
				await db.delete(formSubmissions).where(eq(formSubmissions.id, id));
			}
		} else if (['unread', 'read', 'spam', 'trash'].includes(action)) {
			for (const id of ids) {
				await db.update(formSubmissions).set({ status: action as 'unread' | 'read' | 'spam' | 'trash' }).where(eq(formSubmissions.id, id));
			}
		}

		logActivity({
			userId: locals.user.id,
			userDisplayName: locals.user.displayName,
			action: 'form_submissions_bulk_' + action,
			objectType: 'form'
		}).catch(() => {});

		return { success: true };
	},

	delete: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const data = await request.formData();
		const id = Number(data.get('id'));
		await db.delete(formSubmissions).where(eq(formSubmissions.id, id));
		return { success: true };
	}
};
