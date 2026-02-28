import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { comments, posts } from '$lib/server/db/schema.js';
import { eq, desc, and, like, count, sql, inArray } from 'drizzle-orm';
import { logActivity } from '$lib/server/activity/index.js';

const PER_PAGE = 20;

export const load: PageServerLoad = async ({ url }) => {
	const status = url.searchParams.get('status') ?? 'all';
	const search = url.searchParams.get('search') ?? '';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));

	const conditions = [];
	if (status !== 'all') {
		conditions.push(eq(comments.status, status as 'approved' | 'pending' | 'spam' | 'trash'));
	}
	if (search) {
		conditions.push(like(comments.content, `%${search}%`));
	}

	const whereClause = conditions.length ? and(...conditions) : sql`1=1`;

	// Count by status
	const allCounts = db
		.select({ status: comments.status, cnt: count() })
		.from(comments)
		.groupBy(comments.status)
		.all();

	const statusCounts: Record<string, number> = { all: 0, approved: 0, pending: 0, spam: 0, trash: 0 };
	for (const row of allCounts) {
		statusCounts[row.status] = Number(row.cnt);
		statusCounts.all += Number(row.cnt);
	}

	const [{ count: total }] = db
		.select({ count: count() })
		.from(comments)
		.where(whereClause)
		.all();

	const offset = (page - 1) * PER_PAGE;

	const commentList = db
		.select({
			id: comments.id,
			postId: comments.postId,
			authorName: comments.authorName,
			authorEmail: comments.authorEmail,
			authorUrl: comments.authorUrl,
			authorIp: comments.authorIp,
			content: comments.content,
			status: comments.status,
			parentId: comments.parentId,
			date: comments.date,
			postTitle: posts.title,
			postSlug: posts.slug
		})
		.from(comments)
		.leftJoin(posts, eq(comments.postId, posts.id))
		.where(whereClause)
		.orderBy(desc(comments.date))
		.limit(PER_PAGE)
		.offset(offset)
		.all();

	return {
		comments: commentList,
		statusCounts,
		total: Number(total),
		page,
		perPage: PER_PAGE,
		search,
		status
	};
};

export const actions: Actions = {
	approve: async ({ request, locals }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Missing id.' });
		await db.update(comments).set({ status: 'approved' }).where(eq(comments.id, id));
		logActivity({
			userId: locals.user?.id,
			userDisplayName: locals.user?.displayName,
			action: 'comment_approved',
			objectType: 'comment',
			objectId: id
		}).catch(() => {});
		return { success: true };
	},

	unapprove: async ({ request, locals }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Missing id.' });
		await db.update(comments).set({ status: 'pending' }).where(eq(comments.id, id));
		logActivity({
			userId: locals.user?.id,
			userDisplayName: locals.user?.displayName,
			action: 'comment_unapproved',
			objectType: 'comment',
			objectId: id
		}).catch(() => {});
		return { success: true };
	},

	spam: async ({ request, locals }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Missing id.' });
		await db.update(comments).set({ status: 'spam' }).where(eq(comments.id, id));
		logActivity({
			userId: locals.user?.id,
			userDisplayName: locals.user?.displayName,
			action: 'comment_marked_spam',
			objectType: 'comment',
			objectId: id
		}).catch(() => {});
		return { success: true };
	},

	trash: async ({ request, locals }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Missing id.' });
		await db.update(comments).set({ status: 'trash' }).where(eq(comments.id, id));
		logActivity({
			userId: locals.user?.id,
			userDisplayName: locals.user?.displayName,
			action: 'comment_trashed',
			objectType: 'comment',
			objectId: id
		}).catch(() => {});
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Missing id.' });
		await db.delete(comments).where(eq(comments.id, id));
		logActivity({
			userId: locals.user?.id,
			userDisplayName: locals.user?.displayName,
			action: 'comment_deleted',
			objectType: 'comment',
			objectId: id
		}).catch(() => {});
		return { success: true };
	},

	bulk: async ({ request, locals }) => {
		const data = await request.formData();
		const action = String(data.get('bulkAction') ?? '');
		const ids = data.getAll('commentIds').map((v) => Number(v)).filter(Boolean);

		if (!ids.length) return fail(400, { error: 'No comments selected.' });

		if (action === 'approve') {
			await db.update(comments).set({ status: 'approved' }).where(inArray(comments.id, ids));
			logActivity({ userId: locals.user?.id, userDisplayName: locals.user?.displayName, action: 'comment_approved', objectType: 'comment', details: { ids, bulk: true } }).catch(() => {});
		} else if (action === 'unapprove') {
			await db.update(comments).set({ status: 'pending' }).where(inArray(comments.id, ids));
			logActivity({ userId: locals.user?.id, userDisplayName: locals.user?.displayName, action: 'comment_unapproved', objectType: 'comment', details: { ids, bulk: true } }).catch(() => {});
		} else if (action === 'spam') {
			await db.update(comments).set({ status: 'spam' }).where(inArray(comments.id, ids));
			logActivity({ userId: locals.user?.id, userDisplayName: locals.user?.displayName, action: 'comment_marked_spam', objectType: 'comment', details: { ids, bulk: true } }).catch(() => {});
		} else if (action === 'trash') {
			await db.update(comments).set({ status: 'trash' }).where(inArray(comments.id, ids));
			logActivity({ userId: locals.user?.id, userDisplayName: locals.user?.displayName, action: 'comment_trashed', objectType: 'comment', details: { ids, bulk: true } }).catch(() => {});
		} else if (action === 'delete') {
			await db.delete(comments).where(inArray(comments.id, ids));
			logActivity({ userId: locals.user?.id, userDisplayName: locals.user?.displayName, action: 'comment_deleted', objectType: 'comment', details: { ids, bulk: true } }).catch(() => {});
		} else {
			return fail(400, { error: 'Unknown action.' });
		}

		return { success: true };
	},

	reply: async ({ request, locals }) => {
		const data = await request.formData();
		const parentId = Number(data.get('parentId'));
		const postId = Number(data.get('postId'));
		const content = String(data.get('content') ?? '').trim();

		if (!content || !postId) return fail(400, { error: 'Missing fields.' });

		await db.insert(comments).values({
			postId,
			authorId: locals.user!.id,
			authorName: locals.user!.displayName,
			authorEmail: locals.user!.email,
			content,
			status: 'approved',
			parentId: parentId || null,
			date: new Date()
		});

		return { success: true };
	}
};
