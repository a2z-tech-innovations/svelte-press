import { redirect, fail, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { posts, users, terms, postTerms, revisions, postMeta, options } from '$lib/server/db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { slugify } from '$lib/utils.js';
import { nanoid } from 'nanoid';
import { logActivity } from '$lib/server/activity/index.js';

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

	// Load existing post password if any
	const postPasswordMeta = db
		.select({ metaValue: postMeta.metaValue })
		.from(postMeta)
		.where(and(eq(postMeta.postId, id), eq(postMeta.metaKey, 'post_password')))
		.get();

	// Load permalink structure so the editor can show the correct preview URL
	const permalinkOpt = db
		.select({ optionValue: options.optionValue })
		.from(options)
		.where(eq(options.optionName, 'permalink_structure'))
		.get();
	const permalinkStructure = permalinkOpt?.optionValue ?? '/%postname%/';

	return {
		post,
		postCategories,
		postTags,
		categories,
		tags,
		allUsers,
		postPassword: postPasswordMeta?.metaValue ?? '',
		permalinkStructure
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
		const postPassword = String(data.get('postPassword') ?? '').trim();

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

		// Upsert post password in postMeta
		if (status === 'private' && postPassword) {
			const existing = db
				.select({ id: postMeta.id })
				.from(postMeta)
				.where(and(eq(postMeta.postId, id), eq(postMeta.metaKey, 'post_password')))
				.get();
			if (existing) {
				await db.update(postMeta).set({ metaValue: postPassword }).where(eq(postMeta.id, existing.id));
			} else {
				await db.insert(postMeta).values({ postId: id, metaKey: 'post_password', metaValue: postPassword });
			}
		} else if (status !== 'private') {
			// Remove password if post is no longer private
			await db.delete(postMeta).where(and(eq(postMeta.postId, id), eq(postMeta.metaKey, 'post_password')));
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

		logActivity({
			userId: locals.user!.id,
			userDisplayName: locals.user!.displayName,
			action: 'post_updated',
			objectType: 'post',
			objectId: id,
			objectTitle: title,
			details: { status }
		}).catch(() => {});

		return { success: true };
	},

	trash: async ({ params, locals }) => {
		const id = Number(params.id);
		const post = db.select({ title: posts.title }).from(posts).where(eq(posts.id, id)).get();
		await db.update(posts).set({ status: 'trash' }).where(eq(posts.id, id));
		logActivity({
			userId: locals.user?.id,
			userDisplayName: locals.user?.displayName,
			action: 'post_trashed',
			objectType: 'post',
			objectId: id,
			objectTitle: post?.title ?? ''
		}).catch(() => {});
		redirect(302, '/sp-admin/posts?status=trash');
	},

	restore: async ({ params, locals }) => {
		const id = Number(params.id);
		const post = db.select({ title: posts.title }).from(posts).where(eq(posts.id, id)).get();
		await db.update(posts).set({ status: 'draft' }).where(eq(posts.id, id));
		logActivity({
			userId: locals.user?.id,
			userDisplayName: locals.user?.displayName,
			action: 'post_restored',
			objectType: 'post',
			objectId: id,
			objectTitle: post?.title ?? ''
		}).catch(() => {});
		redirect(302, `/sp-admin/posts/${id}`);
	}
};
