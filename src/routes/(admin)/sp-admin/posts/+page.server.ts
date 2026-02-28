import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { posts, users } from '$lib/server/db/schema.js';
import { eq, desc, and, or, like, count, sql, inArray } from 'drizzle-orm';

const PER_PAGE = 20;

export const load: PageServerLoad = async ({ url }) => {
	const status = url.searchParams.get('status') ?? 'all';
	const search = url.searchParams.get('search') ?? '';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));

	// Build where conditions
	const baseConditions = [eq(posts.postType, 'post')];

	if (status !== 'all') {
		baseConditions.push(eq(posts.status, status as 'draft' | 'publish' | 'private' | 'future' | 'trash' | 'pending'));
	} else {
		// Exclude trash from "all"
		baseConditions.push(sql`${posts.status} != 'trash'`);
	}

	if (search) {
		baseConditions.push(like(posts.title, `%${search}%`));
	}

	const whereClause = and(...baseConditions);

	// Count status totals
	const allCounts = db
		.select({ status: posts.status, cnt: count() })
		.from(posts)
		.where(and(eq(posts.postType, 'post'), search ? like(posts.title, `%${search}%`) : sql`1=1`))
		.groupBy(posts.status)
		.all();

	const statusCounts: Record<string, number> = { all: 0, publish: 0, draft: 0, pending: 0, private: 0, trash: 0 };
	for (const row of allCounts) {
		statusCounts[row.status] = Number(row.cnt);
		if (row.status !== 'trash') {
			statusCounts.all += Number(row.cnt);
		}
	}

	// Total for current filter
	const [{ count: total }] = db
		.select({ count: count() })
		.from(posts)
		.where(whereClause)
		.all();

	const offset = (page - 1) * PER_PAGE;

	const postList = db
		.select({
			id: posts.id,
			title: posts.title,
			slug: posts.slug,
			status: posts.status,
			postDate: posts.postDate,
			modifiedDate: posts.modifiedDate,
			sticky: posts.sticky,
			commentStatus: posts.commentStatus,
			authorId: posts.authorId,
			authorName: users.displayName
		})
		.from(posts)
		.leftJoin(users, eq(posts.authorId, users.id))
		.where(whereClause)
		.orderBy(desc(posts.modifiedDate))
		.limit(PER_PAGE)
		.offset(offset)
		.all();

	return {
		posts: postList,
		statusCounts,
		total: Number(total),
		page,
		perPage: PER_PAGE,
		search,
		status
	};
};

export const actions: Actions = {
	bulk: async ({ request }) => {
		const data = await request.formData();
		const action = String(data.get('bulkAction') ?? '');
		const ids = data.getAll('postIds').map((v) => Number(v)).filter(Boolean);

		if (!ids.length) return fail(400, { error: 'No posts selected.' });

		if (action === 'trash') {
			await db.update(posts).set({ status: 'trash' }).where(inArray(posts.id, ids));
		} else if (action === 'restore') {
			await db.update(posts).set({ status: 'draft' }).where(inArray(posts.id, ids));
		} else if (action === 'delete') {
			await db.delete(posts).where(inArray(posts.id, ids));
		} else if (action === 'publish') {
			await db.update(posts).set({ status: 'publish', postDate: new Date() }).where(inArray(posts.id, ids));
		} else {
			return fail(400, { error: 'Unknown action.' });
		}

		return { success: true };
	},

	trash: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Missing id.' });
		await db.update(posts).set({ status: 'trash' }).where(eq(posts.id, id));
		return { success: true };
	},

	restore: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Missing id.' });
		await db.update(posts).set({ status: 'draft' }).where(eq(posts.id, id));
		return { success: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Missing id.' });
		await db.delete(posts).where(eq(posts.id, id));
		return { success: true };
	}
};
