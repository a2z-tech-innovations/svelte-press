import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { posts, users, terms, postTerms, revisions } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { slugify } from '$lib/utils.js';
import { nanoid } from 'nanoid';

export const load: PageServerLoad = async () => {
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

		if (!title) return fail(400, { error: 'Title is required.' });

		let content: unknown[] = [];
		try {
			content = JSON.parse(contentRaw);
		} catch {
			content = [];
		}

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

		// Save revision
		await db.insert(revisions).values({
			postId,
			title,
			content,
			excerpt,
			userId: locals.user!.id,
			createdAt: now
		});

		redirect(302, `/sp-admin/posts/${postId}`);
	}
};
