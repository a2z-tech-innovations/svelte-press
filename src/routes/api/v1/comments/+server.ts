import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { comments, posts } from '$lib/server/db/schema.js';
import { eq, and, desc, count } from 'drizzle-orm';

// ─── GET /api/v1/comments ─────────────────────────────────────────────────────
// List approved comments. Supports ?post_id=&page=&per_page= filters.

export const GET: RequestHandler = async ({ url }) => {
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
	const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get('per_page') ?? 20)));
	const offset = (page - 1) * perPage;
	const postIdParam = url.searchParams.get('post_id')?.trim() ?? '';
	const postId = postIdParam ? Number(postIdParam) : null;

	const conditions = [eq(comments.status, 'approved')];

	if (postId !== null && !isNaN(postId)) {
		// Verify the post exists and is published
		const post = db
			.select({ id: posts.id })
			.from(posts)
			.where(and(eq(posts.id, postId), eq(posts.status, 'publish')))
			.get();
		if (!post) throw error(404, `Post ${postId} not found`);
		conditions.push(eq(comments.postId, postId));
	}

	const where = and(...conditions);

	const [{ total }] = db
		.select({ total: count() })
		.from(comments)
		.where(where)
		.all();

	const rows = db
		.select({
			id: comments.id,
			postId: comments.postId,
			authorId: comments.authorId,
			authorName: comments.authorName,
			authorEmail: comments.authorEmail,
			authorUrl: comments.authorUrl,
			content: comments.content,
			status: comments.status,
			parentId: comments.parentId,
			date: comments.date
		})
		.from(comments)
		.where(where)
		.orderBy(desc(comments.date))
		.limit(perPage)
		.offset(offset)
		.all();

	const totalPages = Math.ceil(total / perPage);

	return json(rows, {
		headers: {
			'X-Total': String(total),
			'X-Total-Pages': String(totalPages),
			'Access-Control-Expose-Headers': 'X-Total, X-Total-Pages'
		}
	});
};

// ─── POST /api/v1/comments ────────────────────────────────────────────────────
// Submit a comment. Auth is optional — logged-in users get auto-approved.
// Body: { postId, authorName, authorEmail, content, parentId? }

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	let body: {
		postId?: unknown;
		authorName?: unknown;
		authorEmail?: unknown;
		content?: unknown;
		parentId?: unknown;
	};

	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	// Validate postId
	const postId = typeof body.postId === 'number' ? body.postId : null;
	if (!postId) throw error(400, 'postId is required');

	// Verify post exists, is published, and comments are open
	const post = db
		.select({ id: posts.id, commentStatus: posts.commentStatus, status: posts.status })
		.from(posts)
		.where(eq(posts.id, postId))
		.get();

	if (!post || post.status !== 'publish') throw error(404, 'Post not found');
	if (post.commentStatus !== 'open') throw error(403, 'Comments are closed for this post');

	// Determine author details
	let authorName: string;
	let authorEmail: string;
	let authorId: number | null = null;

	if (locals.user) {
		// Logged-in users use their profile data
		authorId = locals.user.id;
		authorName = locals.user.displayName;
		authorEmail = locals.user.email;
	} else {
		authorName = typeof body.authorName === 'string' ? body.authorName.trim() : '';
		authorEmail = typeof body.authorEmail === 'string' ? body.authorEmail.trim() : '';
		if (!authorName) throw error(400, 'authorName is required');
		if (!authorEmail || !authorEmail.includes('@')) throw error(400, 'Valid authorEmail is required');
	}

	const content = typeof body.content === 'string' ? body.content.trim() : '';
	if (!content) throw error(400, 'Comment content is required');
	if (content.length > 65535) throw error(400, 'Comment content is too long');

	const parentId = typeof body.parentId === 'number' ? body.parentId : null;

	// Verify parent comment belongs to the same post if provided
	if (parentId !== null) {
		const parent = db
			.select({ id: comments.id })
			.from(comments)
			.where(and(eq(comments.id, parentId), eq(comments.postId, postId)))
			.get();
		if (!parent) throw error(400, 'Parent comment not found for this post');
	}

	// Logged-in users get auto-approved; guests are pending
	const status = locals.user ? 'approved' : 'pending';

	const clientIp = getClientAddress();

	const [inserted] = await db
		.insert(comments)
		.values({
			postId,
			authorId,
			authorName,
			authorEmail,
			authorUrl: '',
			authorIp: clientIp,
			content,
			status,
			parentId
		})
		.returning();

	return json(inserted, { status: 201 });
};
