import { redirect, fail, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { posts, users, terms, postTerms, revisions } from '$lib/server/db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { slugify } from '$lib/utils.js';
import { nanoid } from 'nanoid';

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	if (!id) error(404, 'Post not found');

	const post = db
		.select()
		.from(posts)
		.where(and(eq(posts.id, id), eq(posts.postType, 'post')))
		.get();

	if (!post) error(404, 'Post not found');

	// Load post terms
	const postTermRows = db
		.select({ termId: postTerms.termId })
		.from(postTerms)
		.where(eq(postTerms.postId, id))
		.all();

	const termIds = postTermRows.map((r) => r.termId);

	const postCategories = termIds.length
		? db.select().from(terms).where(and(eq(terms.taxonomy, 'category'), inArray(terms.id, termIds))).all()
		: [];

	const postTags = termIds.length
		? db.select().from(terms).where(and(eq(terms.taxonomy, 'tag'), inArray(terms.id, termIds))).all()
		: [];

	const categories = db.select().from(terms).where(eq(terms.taxonomy, 'category')).all();
	const tags = db.select().from(terms).where(eq(terms.taxonomy, 'tag')).all();
	const allUsers = db.select({
		id: users.id,
		displayName: users.displayName,
		username: users.username
	}).from(users).all();

	return {
		post,
		postCategories,
		postTags,
		categories,
		tags,
		allUsers
	};
};

export const actions: Actions = {
	save: async ({ request, locals, params }) => {
		const id = Number(params.id);
		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim();
		const contentRaw = String(data.get('content') ?? '[]');
		const status = String(data.get('status') ?? 'draft') as 'draft' | 'publish' | 'private' | 'pending';
		const excerpt = String(data.get('excerpt') ?? '');
		const slugVal = String(data.get('slug') ?? '').trim() || slugify(title) || nanoid(8);
		const authorId = Number(data.get('authorId') ?? locals.user!.id);
		const sticky = data.get('sticky') === '1';
		const commentStatus = data.get('commentStatus') === 'open' ? 'open' : 'closed';
		const categoryIds = data.getAll('categoryIds').map(Number).filter(Boolean);
		const tagIds = data.getAll('tagIds').map(Number).filter(Boolean);

		if (!title) return fail(400, { error: 'Title is required.' });

		let content: unknown[] = [];
		try {
			content = JSON.parse(contentRaw);
		} catch {
			content = [];
		}

		const now = new Date();

		const existingPost = db.select({ status: posts.status, postDate: posts.postDate }).from(posts).where(eq(posts.id, id)).get();
		const postDate = status === 'publish' && existingPost?.status !== 'publish' ? now : existingPost?.postDate ?? null;

		await db.update(posts).set({
			title,
			slug: slugVal,
			content,
			excerpt,
			status,
			authorId,
			sticky,
			commentStatus,
			postDate,
			modifiedDate: now
		}).where(eq(posts.id, id));

		// Update post terms - delete old, insert new
		await db.delete(postTerms).where(eq(postTerms.postId, id));
		const termIds = [...categoryIds, ...tagIds];
		if (termIds.length > 0) {
			await db.insert(postTerms).values(termIds.map((termId) => ({ postId: id, termId })));
		}

		// Save revision
		await db.insert(revisions).values({
			postId: id,
			title,
			content,
			excerpt,
			userId: locals.user!.id,
			createdAt: now
		});

		return { success: true };
	},

	trash: async ({ params }) => {
		const id = Number(params.id);
		await db.update(posts).set({ status: 'trash' }).where(eq(posts.id, id));
		redirect(302, '/sp-admin/posts?status=trash');
	},

	restore: async ({ params }) => {
		const id = Number(params.id);
		await db.update(posts).set({ status: 'draft' }).where(eq(posts.id, id));
		redirect(302, `/sp-admin/posts/${id}`);
	}
};
