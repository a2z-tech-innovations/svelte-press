import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { activityLog } from '$lib/server/db/schema.js';
import { desc, like, and, count, sql } from 'drizzle-orm';

const PER_PAGE = 50;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(302, '/sp-login');

	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
	const filter = url.searchParams.get('action') ?? '';
	const objectType = url.searchParams.get('type') ?? '';
	const offset = (page - 1) * PER_PAGE;

	const conditions = [];
	if (filter) {
		conditions.push(like(activityLog.action, `%${filter}%`));
	}
	if (objectType) {
		conditions.push(like(activityLog.objectType, `%${objectType}%`));
	}

	const whereClause = conditions.length ? and(...conditions) : sql`1=1`;

	const logs = db
		.select()
		.from(activityLog)
		.where(whereClause)
		.orderBy(desc(activityLog.createdAt))
		.limit(PER_PAGE)
		.offset(offset)
		.all();

	const [{ count: total }] = db
		.select({ count: count() })
		.from(activityLog)
		.where(whereClause)
		.all();

	return {
		logs,
		total: Number(total),
		page,
		perPage: PER_PAGE,
		filter,
		objectType
	};
};
