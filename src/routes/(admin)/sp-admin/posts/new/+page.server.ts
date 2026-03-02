import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { posts, users, terms, postTerms, revisions, postMeta } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { slugify } from '$lib/utils.js';
import { nanoid } from 'nanoid';
import { logActivity } from '$lib/server/activity/index.js';
import { syncFormToDb } from '$lib/server/forms/index.js';
import type { FormField, FormSettings } from '$lib/types/index.js';
import { can } from '$lib/server/permissions/index.js';

export const load: PageServerLoad = async ({ locals }) => {
	if (!can(locals.user?.role, 'edit_posts')) redirect(302, '/sp-admin/dashboard');
	const categories = db.select().from(terms).where(eq(terms.taxonomy, 'category')).all();
	const tags = db.select().from(terms).where(eq(terms.taxonomy, 'tag')).all();
	const allUsers = db.select({
		id: users.id,
		displayName: users.displayName,
		username: users.username
	}).from(users).all();

	return { categories, tags, allUsers };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim();
		const contentRaw = String(data.get('content') ?? '[]');
		const status = (String(data.get('status') ?? 'draft')) as 'draft' | 'publish' | 'private' | 'pending';
		const excerpt = String(data.get('excerpt') ?? '');
		const slug = String(data.get('slug') ?? '').trim() || slugify(title) || nanoid(8);
		const authorId = Number(data.get('authorId') ?? locals.user!.id);
		const sticky = data.get('sticky') === '1';
		const commentStatus = data.get('commentStatus') === 'open' ? 'open' : 'closed';
		const categoryIds = data.getAll('categoryIds').map(Number).filter(Boolean);
		const tagIds = data.getAll('tagIds').map(Number).filter(Boolean);
		const postPassword = String(data.get('postPassword') ?? '').trim();

		if (!title) return fail(400, { error: 'Title is required.' });

		let parsedContent: unknown = null;
		try {
			parsedContent = JSON.parse(contentRaw);
		} catch {
			parsedContent = [];
		}
		const content = parsedContent as unknown[];

		const now = new Date();
		const postDate = status === 'publish' ? now : null;

		const result = await db.insert(posts).values({
			title,
			slug,
			content,
			excerpt,
			status,
			postType: 'post',
			authorId,
			sticky,
			commentStatus,
			postDate,
			modifiedDate: now
		}).returning({ id: posts.id });

		const postId = result[0].id;

		// Save terms
		const termIds = [...categoryIds, ...tagIds];
		if (termIds.length > 0) {
			await db.insert(postTerms).values(termIds.map((termId) => ({ postId, termId })));
		}

		// Save post password to postMeta if status is private and password provided
		if (status === 'private' && postPassword) {
			const existing = db
				.select({ id: postMeta.id })
				.from(postMeta)
				.where(and(eq(postMeta.postId, postId), eq(postMeta.metaKey, 'post_password')))
				.get();
			if (existing) {
				await db.update(postMeta).set({ metaValue: postPassword }).where(eq(postMeta.id, existing.id));
			} else {
				await db.insert(postMeta).values({ postId, metaKey: 'post_password', metaValue: postPassword });
			}
		}

		// Save revision
		await db.insert(revisions).values({
			postId,
			title,
			content,
			excerpt,
			userId: locals.user!.id,
			createdAt: now
		});

		logActivity({
			userId: locals.user!.id,
			userDisplayName: locals.user!.displayName,
			action: status === 'publish' ? 'post_published' : 'post_saved',
			objectType: 'post',
			objectId: postId,
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
							postId,
							n.attrs.nodeId,
							n.attrs.title ?? '',
							(n.attrs.fields as FormField[]) ?? [],
							(n.attrs.settings as FormSettings) ?? { submitLabel: 'Send', successMessage: 'Thank you!', emailNotification: false }
						);
					}
				}
			}
		}

		redirect(302, `/sp-admin/posts/${postId}`);
	}
};
