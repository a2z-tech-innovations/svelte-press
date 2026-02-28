import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { createHash } from 'crypto';
import { db } from '$lib/server/db/index.js';

function gravatar(email: string, size = 48): string {
	const hash = createHash('md5').update((email ?? '').trim().toLowerCase()).digest('hex');
	return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=mp`;
}
import { posts, users, postTerms, terms, comments } from '$lib/server/db/schema.js';
import { eq, desc, and, count, sql } from 'drizzle-orm';

const PER_PAGE = 10;

export const load: PageServerLoad = async ({ params, url }) => {
	const { username } = params;
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));

	// Find author by username
	const author = db
		.select({
			id: users.id,
			username: users.username,
			displayName: users.displayName,
			email: users.email,
			bio: users.bio,
			avatar: users.avatar,
			registeredAt: users.registeredAt
		})
		.from(users)
		.where(eq(users.username, username))
		.get();

	if (!author) {
		error(404, 'Author not found');
	}

	// Count published posts by this author
	const [{ count: postCount }] = db
		.select({ count: count() })
		.from(posts)
		.where(and(eq(posts.authorId, author.id), eq(posts.postType, 'post'), eq(posts.status, 'publish')))
		.all();

	const offset = (page - 1) * PER_PAGE;

	const postList = db
		.select({
			id: posts.id,
			title: posts.title,
			slug: posts.slug,
			excerpt: posts.excerpt,
			postDate: posts.postDate,
			sticky: posts.sticky
		})
		.from(posts)
		.where(and(eq(posts.authorId, author.id), eq(posts.postType, 'post'), eq(posts.status, 'publish')))
		.orderBy(desc(posts.postDate))
		.limit(PER_PAGE)
		.offset(offset)
		.all();

	// Fetch categories for each post
	const postIds = postList.map((p) => p.id);
	const categoryMap: Record<number, Array<{ id: number; name: string; slug: string }>> = {};

	if (postIds.length > 0) {
		const allCategories = db
			.select({
				postId: postTerms.postId,
				termId: terms.id,
				name: terms.name,
				slug: terms.slug
			})
			.from(postTerms)
			.innerJoin(terms, eq(postTerms.termId, terms.id))
			.where(
				and(
					eq(terms.taxonomy, 'category'),
					sql`${postTerms.postId} IN (${sql.join(
						postIds.map((id) => sql`${id}`),
						sql`, `
					)})`
				)
			)
			.all();

		for (const row of allCategories) {
			if (!categoryMap[row.postId]) categoryMap[row.postId] = [];
			categoryMap[row.postId].push({ id: row.termId, name: row.name, slug: row.slug });
		}
	}

	// Comment counts
	const commentCountMap: Record<number, number> = {};
	if (postIds.length > 0) {
		const commentCounts = db
			.select({ postId: comments.postId, cnt: count() })
			.from(comments)
			.where(
				and(
					eq(comments.status, 'approved'),
					sql`${comments.postId} IN (${sql.join(
						postIds.map((id) => sql`${id}`),
						sql`, `
					)})`
				)
			)
			.groupBy(comments.postId)
			.all();

		for (const row of commentCounts) {
			commentCountMap[row.postId] = Number(row.cnt);
		}
	}

	const enrichedPosts = postList.map((p) => ({
		...p,
		categories: categoryMap[p.id] ?? [],
		commentCount: commentCountMap[p.id] ?? 0
	}));

	return {
		author: {
			...author,
			gravatarUrl: gravatar(author.email ?? '', 96)
		},
		posts: enrichedPosts,
		postCount: Number(postCount),
		page,
		total: Number(postCount),
		perPage: PER_PAGE
	};
};
