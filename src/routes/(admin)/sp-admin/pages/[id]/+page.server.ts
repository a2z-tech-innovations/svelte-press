import { redirect, fail, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { posts, users, revisions } from '$lib/server/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { slugify } from '$lib/utils.js';
import { nanoid } from 'nanoid';

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	if (!id) error(404, 'Page not found');

	const post = db
		.select()
		.from(posts)
		.where(and(eq(posts.id, id), eq(posts.postType, 'page')))
		.get();

	if (!post) error(404, 'Page not found');

	const allPages = db
		.select({ id: posts.id, title: posts.title, parentId: posts.parentId })
		.from(posts)
		.where(and(eq(posts.postType, 'page'), sql`${posts.id} != ${id}`, sql`${posts.status} != 'trash'`))
		.all();

	const allUsers = db.select({
		id: users.id,
		displayName: users.displayName,
		username: users.username
	}).from(users).all();

	return { post, allPages, allUsers };
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
		const parentId = Number(data.get('parentId') ?? 0) || null;
		const menuOrder = Number(data.get('menuOrder') ?? 0);
		const template = String(data.get('template') ?? '');
		const commentStatus = data.get('commentStatus') === 'open' ? 'open' : 'closed';

		if (!title) return fail(400, { error: 'Title is required.' });

		let content: unknown[] = [];
		try { content = JSON.parse(contentRaw); } catch { content = []; }

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
			parentId,
			menuOrder,
			template,
			commentStatus,
			postDate,
			modifiedDate: now
		}).where(eq(posts.id, id));

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
		redirect(302, '/sp-admin/pages?status=trash');
	},

	restore: async ({ params }) => {
		const id = Number(params.id);
		await db.update(posts).set({ status: 'draft' }).where(eq(posts.id, id));
		redirect(302, `/sp-admin/pages/${id}`);
	}
};
