import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { posts, users, postTerms, terms, comments, options } from '$lib/server/db/schema.js';
import { eq, desc, and, count, sql } from 'drizzle-orm';
import { getPermalinkUrl } from '$lib/utils.js';

const PER_PAGE = 10;

export const load: PageServerLoad = async ({ url }) => {
	// Handle ?p=<id> — supports the "plain" permalink structure
	// When ?p=<id> is in the URL, redirect to the canonical permalink for the post.
	// For plain structure ('' empty), /archives/<id> is the numeric fallback.
	const pParam = url.searchParams.get('p');
	if (pParam) {
		const id = parseInt(pParam, 10);
		if (!isNaN(id) && id > 0) {
			const post = db
				.select({ id: posts.id, slug: posts.slug, postDate: posts.postDate, status: posts.status, postType: posts.postType })
				.from(posts)
				.where(and(eq(posts.id, id), eq(posts.status, 'publish'), eq(posts.postType, 'post')))
				.get();

			if (post) {
				const permalinkOpt = db
					.select({ optionValue: options.optionValue })
					.from(options)
					.where(eq(options.optionName, 'permalink_structure'))
					.get();

				const structure = permalinkOpt?.optionValue ?? '/%postname%/';

				// For plain structure: redirect to numeric archives page which always works
				if (structure === '') {
					redirect(302, `/archives/${post.id}`);
				}

				// For all other structures, redirect to the canonical permalink URL
				const canonicalPath = getPermalinkUrl(
					{ id: post.id, slug: post.slug, postDate: post.postDate },
					structure
				);
				redirect(301, canonicalPath);
			}
		}
	}

	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
	const offset = (page - 1) * PER_PAGE;

	const whereClause = and(eq(posts.postType, 'post'), eq(posts.status, 'publish'));

	// Total count
	const [{ count: total }] = db
		.select({ count: count() })
		.from(posts)
		.where(whereClause)
		.all();

	// Posts with author join
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
		.leftJoin(users, eq(posts.authorId, users.id))
		.where(whereClause)
		.orderBy(desc(posts.sticky), desc(posts.postDate))
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

	// Recent posts for sidebar widget
	const recentPosts = db
		.select({ id: posts.id, title: posts.title, slug: posts.slug, postDate: posts.postDate })
		.from(posts)
		.where(and(eq(posts.postType, 'post'), eq(posts.status, 'publish')))
		.orderBy(desc(posts.postDate))
		.limit(5)
		.all();

	const enrichedPosts = postList.map((p) => ({
		...p,
		categories: categoryMap[p.id] ?? [],
		commentCount: commentCountMap[p.id] ?? 0
	}));

	return {
		posts: enrichedPosts,
		page,
		total: Number(total),
		perPage: PER_PAGE,
		recentPosts
	};
};
