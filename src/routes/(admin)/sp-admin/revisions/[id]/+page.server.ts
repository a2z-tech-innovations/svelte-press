import { redirect, fail, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { posts, revisions } from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	if (!id) error(404, 'Revision not found');

	const revision = db.select().from(revisions).where(eq(revisions.id, id)).get();
	if (!revision) error(404, 'Revision not found');

	const post = db.select().from(posts).where(eq(posts.id, revision.postId)).get();
	if (!post) error(404, 'Post not found');

	const allRevisions = db
		.select()
		.from(revisions)
		.where(eq(revisions.postId, revision.postId))
		.orderBy(desc(revisions.createdAt))
		.all();

	return { revision, post, allRevisions };
};

export const actions: Actions = {
	restore: async ({ params, locals }) => {
		const id = Number(params.id);
		if (!id) return fail(400, { error: 'Missing revision id.' });

		const revision = db.select().from(revisions).where(eq(revisions.id, id)).get();
		if (!revision) return fail(404, { error: 'Revision not found.' });

		const post = db.select().from(posts).where(eq(posts.id, revision.postId)).get();
		if (!post) return fail(404, { error: 'Post not found.' });

		// Save current post state as a new revision before restoring
		await db.insert(revisions).values({
			postId: post.id,
			title: post.title,
			content: post.content,
			excerpt: post.excerpt ?? '',
			userId: locals.user!.id,
			createdAt: new Date()
		});

		// Restore the selected revision content back to the post
		await db.update(posts).set({
			title: revision.title,
			content: revision.content,
			excerpt: revision.excerpt ?? '',
			modifiedDate: new Date()
		}).where(eq(posts.id, post.id));

		redirect(302, `/sp-admin/posts/${post.id}`);
	}
};
