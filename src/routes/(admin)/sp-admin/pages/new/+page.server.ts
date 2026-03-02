import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { posts, users, revisions } from '$lib/server/db/schema.js';
import { eq, sql, and, ne } from 'drizzle-orm';
import { slugify } from '$lib/utils.js';
import { nanoid } from 'nanoid';
import { logActivity } from '$lib/server/activity/index.js';
import { syncFormToDb } from '$lib/server/forms/index.js';
import type { FormField, FormSettings } from '$lib/types/index.js';
import { can } from '$lib/server/permissions/index.js';

export const load: PageServerLoad = async ({ locals }) => {
	if (!can(locals.user?.role, 'edit_pages')) redirect(302, '/sp-admin/dashboard');
	const allPages = db
		.select({ id: posts.id, title: posts.title, parentId: posts.parentId })
		.from(posts)
		.where(and(eq(posts.postType, 'page'), ne(posts.status, 'trash')))
		.all();

	const allUsers = db.select({
		id: users.id,
		displayName: users.displayName,
		username: users.username
	}).from(users).all();

	return { allPages, allUsers };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim();
		const contentRaw = String(data.get('content') ?? '[]');
		const status = String(data.get('status') ?? 'draft') as 'draft' | 'publish' | 'private' | 'pending';
		const excerpt = String(data.get('excerpt') ?? '');
		const slugVal = String(data.get('slug') ?? '').trim() || slugify(title) || nanoid(8);
		const authorId = Number(data.get('authorId') ?? locals.user!.id);
		const parentId = Number(data.get('parentId') ?? 0) || null;
		const menuOrder = Number(data.get('menuOrder') ?? 0);
		const template = String(data.get('template') ?? '');
		const commentStatus = data.get('commentStatus') === 'open' ? 'open' : 'closed';

		if (!title) return fail(400, { error: 'Title is required.' });

		let parsedContent: unknown = null;
		try { parsedContent = JSON.parse(contentRaw); } catch { parsedContent = []; }
		const content = parsedContent as unknown[];

		const now = new Date();
		const postDate = status === 'publish' ? now : null;

		const result = await db.insert(posts).values({
			title,
			slug: slugVal,
			content,
			excerpt,
			status,
			postType: 'page',
			authorId,
			parentId,
			menuOrder,
			template,
			commentStatus,
			postDate,
			modifiedDate: now
		}).returning({ id: posts.id });

		const pageId = result[0].id;

		await db.insert(revisions).values({
			postId: pageId,
			title,
			content,
			excerpt,
			userId: locals.user!.id,
			createdAt: now
		});

		logActivity({
			userId: locals.user!.id,
			userDisplayName: locals.user!.displayName,
			action: status === 'publish' ? 'page_published' : 'page_saved',
			objectType: 'page',
			objectId: pageId,
			objectTitle: title
		}).catch(() => {});

		// Sync form blocks to DB
		if (parsedContent && typeof parsedContent === 'object' && !Array.isArray(parsedContent)) {
			const doc = parsedContent as { type?: string; content?: unknown[] };
			if (doc.type === 'doc' && Array.isArray(doc.content)) {
				const formNodes = doc.content.filter((n: unknown) => (n as { type?: string }).type === 'form');
				for (const node of formNodes) {
					const n = node as { type: string; attrs?: { nodeId?: string; title?: string; fields?: unknown; settings?: unknown } };
					if (n.attrs?.nodeId) {
						await syncFormToDb(
							pageId,
							n.attrs.nodeId,
							n.attrs.title ?? '',
							(n.attrs.fields as FormField[]) ?? [],
							(n.attrs.settings as FormSettings) ?? { submitLabel: 'Send', successMessage: 'Thank you!', emailNotification: false }
						);
					}
				}
			}
		}

		redirect(302, `/sp-admin/pages/${pageId}`);
	}
};
