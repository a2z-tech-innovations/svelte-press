import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { posts, comments, users, media, options } from '$lib/server/db/schema.js';
import { eq, desc, count, and } from 'drizzle-orm';
import { slugify } from '$lib/utils.js';
import { nanoid } from 'nanoid';
import { fail } from '@sveltejs/kit';


export const load: PageServerLoad = async ({ locals }) => {
	const [
		[{ count: totalPosts }],
		[{ count: totalPages }],
		[{ count: totalComments }],
		[{ count: pendingComments }],
		[{ count: totalUsers }],
		[{ count: totalMedia }]
	] = await Promise.all([
		db.select({ count: count() }).from(posts).where(and(eq(posts.postType, 'post'), eq(posts.status, 'publish'))),
		db.select({ count: count() }).from(posts).where(and(eq(posts.postType, 'page'), eq(posts.status, 'publish'))),
		db.select({ count: count() }).from(comments).where(eq(comments.status, 'approved')),
		db.select({ count: count() }).from(comments).where(eq(comments.status, 'pending')),
		db.select({ count: count() }).from(users),
		db.select({ count: count() }).from(media)
	]);

	const recentPosts = db
		.select({
			id: posts.id,
			title: posts.title,
			status: posts.status,
			postDate: posts.postDate,
			modifiedDate: posts.modifiedDate,
			authorName: users.displayName
		})
		.from(posts)
		.leftJoin(users, eq(posts.authorId, users.id))
		.where(eq(posts.postType, 'post'))
		.orderBy(desc(posts.modifiedDate))
		.limit(5)
		.all();

	const recentComments = db
		.select({
			id: comments.id,
			content: comments.content,
			authorName: comments.authorName,
			date: comments.date,
			status: comments.status,
			postId: comments.postId,
			postTitle: posts.title
		})
		.from(comments)
		.leftJoin(posts, eq(comments.postId, posts.id))
		.orderBy(desc(comments.date))
		.limit(5)
		.all();

	const [blogname] = db.select().from(options).where(eq(options.optionName, 'blogname')).all();
	const [blogdesc] = db.select().from(options).where(eq(options.optionName, 'blogdescription')).all();

	return {
		stats: {
			totalPosts: Number(totalPosts),
			totalPages: Number(totalPages),
			totalComments: Number(totalComments),
			pendingComments: Number(pendingComments),
			totalUsers: Number(totalUsers),
			totalMedia: Number(totalMedia)
		},
		recentPosts,
		recentComments,
		siteName: blogname?.optionValue ?? 'SveltePress',
		siteDescription: blogdesc?.optionValue ?? ''
	};
};

export const actions: Actions = {
	quickdraft: async ({ request, locals }) => {
		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim();
		const content = String(data.get('content') ?? '').trim();

		if (!title) return fail(400, { quickDraftError: 'Title is required.' });

		const slug = slugify(title) || nanoid(8);
		const now = new Date();

		await db.insert(posts).values({
			title,
			slug,
			content: content ? [{ id: nanoid(), type: 'paragraph', content, attrs: {} }] : [],
			status: 'draft',
			postType: 'post',
			authorId: locals.user!.id,
			postDate: now,
			modifiedDate: now
		});

		return { quickDraftSuccess: true };
	}
};
