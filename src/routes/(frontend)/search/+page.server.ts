import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { posts, users } from '$lib/server/db/schema.js';
import { eq, desc, and, count, or, like, sql } from 'drizzle-orm';

const PER_PAGE = 10;

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.get('q')?.trim() ?? '';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));

	if (!query) {
		return { posts: [], query: '', total: 0, page: 1, perPage: PER_PAGE };
	}

	const searchPattern = `%${query}%`;

	const baseWhere = and(
		eq(posts.postType, 'post'),
		eq(posts.status, 'publish'),
		or(
			like(posts.title, searchPattern),
			sql`CAST(${posts.content} AS TEXT) LIKE ${searchPattern}`
		)
	);

	const [{ count: total }] = db
		.select({ count: count() })
		.from(posts)
		.where(baseWhere)
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
			authorUsername: users.username
		})
		.from(posts)
		.leftJoin(users, eq(posts.authorId, users.id))
		.where(baseWhere)
		.orderBy(desc(posts.postDate))
		.limit(PER_PAGE)
		.offset(offset)
		.all();

	return {
		posts: postList,
		query,
		total: Number(total),
		page,
		perPage: PER_PAGE
	};
};
