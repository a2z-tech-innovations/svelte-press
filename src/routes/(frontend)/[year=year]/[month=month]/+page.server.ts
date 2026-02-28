import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { posts, users } from '$lib/server/db/schema.js';
import { eq, and, gte, lt, desc } from 'drizzle-orm';

const PER_PAGE = 10;

export const load: PageServerLoad = ({ params, url }) => {
	const year = parseInt(params.year, 10);
	const month = parseInt(params.month, 10);

	if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 1970 || year > 2100) {
		error(404, 'Invalid date');
	}

	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));

	// Build date range: first day of month to first day of next month
	const start = new Date(year, month - 1, 1);
	const end = new Date(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1);

	const archivePosts = db
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
		.where(
			and(
				eq(posts.status, 'publish'),
				eq(posts.postType, 'post'),
				gte(posts.postDate, start),
				lt(posts.postDate, end)
			)
		)
		.orderBy(desc(posts.postDate))
		.limit(PER_PAGE)
		.offset((page - 1) * PER_PAGE)
		.all();

	// Count total posts in this month for pagination
	const allInMonth = db
		.select({ id: posts.id })
		.from(posts)
		.where(
			and(
				eq(posts.status, 'publish'),
				eq(posts.postType, 'post'),
				gte(posts.postDate, start),
				lt(posts.postDate, end)
			)
		)
		.all();

	const total = allInMonth.length;

	// Format month name for display
	const monthName = start.toLocaleString('default', { month: 'long' });

	return {
		archivePosts,
		year,
		month,
		monthName,
		archiveTitle: `${monthName} ${year}`,
		page,
		total,
		perPage: PER_PAGE
	};
};
