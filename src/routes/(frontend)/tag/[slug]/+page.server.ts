import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { posts, users, postTerms, terms, comments } from '$lib/server/db/schema.js';
import { eq, desc, and, count, sql } from 'drizzle-orm';

const PER_PAGE = 10;

export const load: PageServerLoad = async ({ params, url }) => {
	const { slug } = params;
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));

	// Find the tag term
	const tag = db
		.select()
		.from(terms)
		.where(and(eq(terms.slug, slug), eq(terms.taxonomy, 'tag')))
		.get();

	if (!tag) {
		error(404, 'Tag not found');
	}

	// Count posts with this tag
	const [{ count: total }] = db
		.select({ count: count() })
		.from(posts)
		.innerJoin(postTerms, eq(postTerms.postId, posts.id))
		.where(
			and(
				eq(posts.postType, 'post'),
				eq(posts.status, 'publish'),
				eq(postTerms.termId, tag.id)
			)
		)
		.all();

	const offset = (page - 1) * PER_PAGE;

	const postList = db
		.select({
			id: posts.id,
			title: posts.title,
			slug: posts.slug,
			excerpt: posts.excerpt,
			postDate: posts.postDate,
			authorName: users.displayName,
			authorUsername: users.username,
			sticky: posts.sticky
		})
		.from(posts)
		.innerJoin(postTerms, eq(postTerms.postId, posts.id))
		.leftJoin(users, eq(posts.authorId, users.id))
		.where(
			and(
				eq(posts.postType, 'post'),
				eq(posts.status, 'publish'),
				eq(postTerms.termId, tag.id)
			)
		)
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
		tag,
		posts: enrichedPosts,
		page,
		total: Number(total),
		perPage: PER_PAGE
	};
};
