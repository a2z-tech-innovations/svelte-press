import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { posts, users, terms, postTerms } from '$lib/server/db/schema.js';
import { eq, and, desc, count, like, or, inArray } from 'drizzle-orm';
import { can } from '$lib/server/permissions/index.js';
import { slugify } from '$lib/utils.js';
import { nanoid } from 'nanoid';

// ─── GET /api/v1/posts ────────────────────────────────────────────────────────
// Query published posts with optional filters: ?page=&per_page=&search=&category=&author=
// Returns JSON array with pagination headers.

export const GET: RequestHandler = async ({ url }) => {
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
	const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get('per_page') ?? 10)));
	const offset = (page - 1) * perPage;
	const search = url.searchParams.get('search')?.trim() ?? '';
	const categorySlug = url.searchParams.get('category')?.trim() ?? '';
	const authorParam = url.searchParams.get('author')?.trim() ?? '';
	const authorId = authorParam ? Number(authorParam) : null;

	// Base conditions: only published posts of postType='post'
	const conditions = [eq(posts.postType, 'post'), eq(posts.status, 'publish')];

	if (search) {
		conditions.push(
			or(like(posts.title, `%${search}%`), like(posts.excerpt, `%${search}%`))!
		);
	}

	if (authorId && !isNaN(authorId)) {
		conditions.push(eq(posts.authorId, authorId));
	}

	// If filtering by category, resolve the term ids first
	let categoryPostIds: number[] | null = null;
	if (categorySlug) {
		const term = db
			.select({ id: terms.id })
			.from(terms)
			.where(and(eq(terms.slug, categorySlug), eq(terms.taxonomy, 'category')))
			.get();

		if (term) {
			const relations = db
				.select({ postId: postTerms.postId })
				.from(postTerms)
				.where(eq(postTerms.termId, term.id))
				.all();
			categoryPostIds = relations.map((r) => r.postId);
			// If no posts match this category, return empty early
			if (categoryPostIds.length === 0) {
				return json([], {
					headers: {
						'X-Total': '0',
						'X-Total-Pages': '0',
						'Access-Control-Expose-Headers': 'X-Total, X-Total-Pages'
					}
				});
			}
		} else {
			// Unknown category slug → no results
			return json([], {
				headers: {
					'X-Total': '0',
					'X-Total-Pages': '0',
					'Access-Control-Expose-Headers': 'X-Total, X-Total-Pages'
				}
			});
		}
	}

	if (categoryPostIds !== null) {
		conditions.push(inArray(posts.id, categoryPostIds));
	}

	const where = and(...conditions);

	// Count total matching posts
	const [{ total }] = db
		.select({ total: count() })
		.from(posts)
		.where(where)
		.all();

	// Fetch paginated posts joined with author
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
		.orderBy(desc(posts.sticky), desc(posts.postDate))
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

	return json(result, {
		headers: {
			'X-Total': String(total),
			'X-Total-Pages': String(totalPages),
			'Access-Control-Expose-Headers': 'X-Total, X-Total-Pages'
		}
	});
};

// ─── POST /api/v1/posts ───────────────────────────────────────────────────────
// Create a new post. Auth required. Body: { title, content, status, excerpt, categoryIds, tagIds }

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Authentication required');
	if (!can(locals.user.role, 'edit_posts')) throw error(403, 'Forbidden');

	let body: {
		title?: unknown;
		content?: unknown;
		status?: unknown;
		excerpt?: unknown;
		categoryIds?: unknown;
		tagIds?: unknown;
		format?: unknown;
		commentStatus?: unknown;
		sticky?: unknown;
		featuredImageId?: unknown;
		template?: unknown;
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
	const sticky = body.sticky === true;
	const featuredImageId =
		typeof body.featuredImageId === 'number' ? body.featuredImageId : null;

	// Status validation
	const allowedStatuses = ['draft', 'publish', 'private', 'future', 'pending'] as const;
	type PostStatus = (typeof allowedStatuses)[number];
	const rawStatus = typeof body.status === 'string' ? body.status : 'draft';
	const status: PostStatus = allowedStatuses.includes(rawStatus as PostStatus)
		? (rawStatus as PostStatus)
		: 'draft';

	// Only authors+ can publish; contributors are forced to pending
	const effectiveStatus =
		status === 'publish' && !can(locals.user.role, 'publish_posts') ? 'pending' : status;

	// Format validation
	const allowedFormats = [
		'standard', 'aside', 'gallery', 'link', 'image', 'quote',
		'status', 'video', 'audio', 'chat'
	] as const;
	type PostFormat = (typeof allowedFormats)[number];
	const rawFormat = typeof body.format === 'string' ? body.format : 'standard';
	const format: PostFormat = allowedFormats.includes(rawFormat as PostFormat)
		? (rawFormat as PostFormat)
		: 'standard';

	const commentStatus =
		body.commentStatus === 'closed' ? ('closed' as const) : ('open' as const);

	// Generate unique slug
	let slug = slugify(title);
	const existing = db
		.select({ slug: posts.slug })
		.from(posts)
		.where(eq(posts.postType, 'post'))
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
			authorId: locals.user.id,
			parentId: null,
			postType: 'post',
			format,
			sticky,
			featuredImageId,
			template
		})
		.returning();

	// Attach categories
	const categoryIds = Array.isArray(body.categoryIds)
		? (body.categoryIds as unknown[]).filter((id) => typeof id === 'number')
		: [];

	// Attach tags
	const tagIds = Array.isArray(body.tagIds)
		? (body.tagIds as unknown[]).filter((id) => typeof id === 'number')
		: [];

	const allTermIds = [...new Set([...categoryIds, ...tagIds])] as number[];

	if (allTermIds.length > 0) {
		await db.insert(postTerms).values(
			allTermIds.map((termId) => ({ postId: inserted.id, termId }))
		);

		// Increment term counts
		for (const termId of allTermIds) {
			await db
				.update(terms)
				.set({ count: db.$count(postTerms, eq(postTerms.termId, termId)) })
				.where(eq(terms.id, termId));
		}
	}

	return json(inserted, { status: 201 });
};
