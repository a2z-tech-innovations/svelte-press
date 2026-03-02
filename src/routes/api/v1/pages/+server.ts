import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { posts, users } from '$lib/server/db/schema.js';
import { eq, and, desc, count } from 'drizzle-orm';
import { can } from '$lib/server/permissions/index.js';
import { requireCapability } from '$lib/server/api/auth.js';
import { slugify } from '$lib/utils.js';
import { nanoid } from 'nanoid';

// ─── GET /api/v1/pages ────────────────────────────────────────────────────────
// Query published pages. Supports ?parent=&slug= filters.

export const GET: RequestHandler = async ({ url }) => {
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
	const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get('per_page') ?? 10)));
	const offset = (page - 1) * perPage;
	const parentParam = url.searchParams.get('parent')?.trim() ?? '';
	const slugParam = url.searchParams.get('slug')?.trim() ?? '';

	const conditions = [eq(posts.postType, 'page'), eq(posts.status, 'publish')];

	if (slugParam) {
		conditions.push(eq(posts.slug, slugParam));
	}

	if (parentParam !== '') {
		const parentId = Number(parentParam);
		if (!isNaN(parentId)) {
			conditions.push(eq(posts.parentId, parentId));
		}
	}

	const where = and(...conditions);

	const [{ total }] = db
		.select({ total: count() })
		.from(posts)
		.where(where)
		.all();

	const rows = db
		.select({
			id: posts.id,
			title: posts.title,
			slug: posts.slug,
			content: posts.content,
			excerpt: posts.excerpt,
			status: posts.status,
			commentStatus: posts.commentStatus,
			postDate: posts.postDate,
			modifiedDate: posts.modifiedDate,
			authorId: posts.authorId,
			parentId: posts.parentId,
			postType: posts.postType,
			menuOrder: posts.menuOrder,
			format: posts.format,
			sticky: posts.sticky,
			featuredImageId: posts.featuredImageId,
			template: posts.template,
			authorUsername: users.username,
			authorDisplayName: users.displayName,
			authorEmail: users.email,
			authorAvatar: users.avatar
		})
		.from(posts)
		.leftJoin(users, eq(posts.authorId, users.id))
		.where(where)
		.orderBy(posts.menuOrder, desc(posts.postDate))
		.limit(perPage)
		.offset(offset)
		.all();

	const result = rows.map((row) => ({
		id: row.id,
		title: row.title,
		slug: row.slug,
		content: row.content,
		excerpt: row.excerpt,
		status: row.status,
		commentStatus: row.commentStatus,
		postDate: row.postDate,
		modifiedDate: row.modifiedDate,
		parentId: row.parentId,
		postType: row.postType,
		menuOrder: row.menuOrder,
		format: row.format,
		sticky: row.sticky,
		featuredImageId: row.featuredImageId,
		template: row.template,
		author: row.authorId
			? {
					id: row.authorId,
					username: row.authorUsername,
					displayName: row.authorDisplayName,
					email: row.authorEmail,
					avatar: row.authorAvatar
				}
			: null
	}));

	const totalPages = Math.ceil(total / perPage);

	return json({ pages: result, total, page, perPage, totalPages }, {
		headers: {
			'X-Total': String(total),
			'X-Total-Pages': String(totalPages),
			'Access-Control-Expose-Headers': 'X-Total, X-Total-Pages'
		}
	});
};

// ─── POST /api/v1/pages ───────────────────────────────────────────────────────
// Create a new page. Auth required (edit_pages capability).

export const POST: RequestHandler = async (event) => {
	const authError = requireCapability(event, 'edit_pages');
	if (authError) return authError;

	const { request, locals } = event;
	// locals.user is guaranteed non-null after requireCapability succeeds
	const user = locals.user!;

	let body: {
		title?: unknown;
		content?: unknown;
		status?: unknown;
		excerpt?: unknown;
		parentId?: unknown;
		menuOrder?: unknown;
		template?: unknown;
		commentStatus?: unknown;
		featuredImageId?: unknown;
	};

	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const title = typeof body.title === 'string' ? body.title.trim() : '';
	if (!title) throw error(400, 'Title is required');

	const content = Array.isArray(body.content) ? body.content : [];
	const excerpt = typeof body.excerpt === 'string' ? body.excerpt.trim() : '';
	const template = typeof body.template === 'string' ? body.template.trim() : '';
	const menuOrder =
		typeof body.menuOrder === 'number' ? body.menuOrder : 0;
	const parentId =
		typeof body.parentId === 'number' ? body.parentId : null;
	const featuredImageId =
		typeof body.featuredImageId === 'number' ? body.featuredImageId : null;

	// Validate parent page exists if provided
	if (parentId !== null) {
		const parent = db
			.select({ id: posts.id })
			.from(posts)
			.where(and(eq(posts.id, parentId), eq(posts.postType, 'page')))
			.get();
		if (!parent) throw error(400, `Parent page with id ${parentId} does not exist`);
	}

	const allowedStatuses = ['draft', 'publish', 'private', 'future', 'pending'] as const;
	type PageStatus = (typeof allowedStatuses)[number];
	const rawStatus = typeof body.status === 'string' ? body.status : 'draft';
	const status: PageStatus = allowedStatuses.includes(rawStatus as PageStatus)
		? (rawStatus as PageStatus)
		: 'draft';

	const effectiveStatus =
		status === 'publish' && !can(user.role, 'publish_pages') ? 'pending' : status;

	const commentStatus =
		body.commentStatus === 'closed' ? ('closed' as const) : ('open' as const);

	// Generate unique slug (scoped to page type)
	let slug = slugify(title);
	const existing = db
		.select({ slug: posts.slug })
		.from(posts)
		.where(eq(posts.postType, 'page'))
		.all()
		.map((r) => r.slug);
	if (existing.includes(slug)) {
		slug = `${slug}-${nanoid(6)}`;
	}

	const postDate = effectiveStatus === 'publish' ? new Date() : null;

	const [inserted] = await db
		.insert(posts)
		.values({
			title,
			slug,
			content,
			excerpt,
			status: effectiveStatus,
			commentStatus,
			postDate,
			authorId: user.id,
			parentId,
			postType: 'page',
			format: 'standard',
			sticky: false,
			featuredImageId,
			menuOrder,
			template
		})
		.returning();

	return json(inserted, { status: 201 });
};
