import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { media } from '$lib/server/db/schema.js';
import { eq, and, count, desc, like } from 'drizzle-orm';
import { requireCapability } from '$lib/server/api/auth.js';

// ─── GET /api/v1/media ────────────────────────────────────────────────────────
// List all media. Supports ?page=&per_page=&mime_type= filters.

export const GET: RequestHandler = async ({ url }) => {
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
	const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get('per_page') ?? 20)));
	const offset = (page - 1) * perPage;
	const mimeTypeFilter = url.searchParams.get('mime_type')?.trim() ?? '';

	const conditions = [];

	if (mimeTypeFilter) {
		// Support partial mime type matching, e.g. "image" matches "image/jpeg"
		conditions.push(like(media.mimeType, `${mimeTypeFilter}%`));
	}

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [{ total }] = db
		.select({ total: count() })
		.from(media)
		.where(where)
		.all();

	const rows = db
		.select({
			id: media.id,
			filename: media.filename,
			originalName: media.originalName,
			mimeType: media.mimeType,
			size: media.size,
			width: media.width,
			height: media.height,
			alt: media.alt,
			caption: media.caption,
			path: media.path,
			sizes: media.sizes,
			uploadedAt: media.uploadedAt,
			uploadedBy: media.uploadedBy
		})
		.from(media)
		.where(where)
		.orderBy(desc(media.uploadedAt))
		.limit(perPage)
		.offset(offset)
		.all();

	const result = rows.map((row) => ({
		id: row.id,
		filename: row.filename,
		originalName: row.originalName,
		mimeType: row.mimeType,
		size: row.size,
		width: row.width,
		height: row.height,
		alt: row.alt ?? '',
		caption: row.caption ?? '',
		path: row.path,
		url: '/' + row.path,
		sizes: row.sizes ?? {},
		uploadedAt: row.uploadedAt,
		uploadedBy: row.uploadedBy
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

// ─── PATCH /api/v1/media ──────────────────────────────────────────────────────
// Update media metadata (alt, caption, description). Auth required (upload_files capability).
// Query: ?id=<number>
// Body: { alt?, caption?, description? }

export const PATCH: RequestHandler = async (event) => {
	const authError = requireCapability(event, 'upload_files');
	if (authError) return authError;

	const { url, request } = event;

	const idParam = url.searchParams.get('id');
	const id = idParam ? Number(idParam) : NaN;
	if (!idParam || isNaN(id)) throw error(400, 'Query parameter "id" (number) is required');

	const existing = db
		.select({ id: media.id })
		.from(media)
		.where(eq(media.id, id))
		.get();
	if (!existing) throw error(404, `Media ${id} not found`);

	let body: { alt?: unknown; caption?: unknown; description?: unknown };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const updates: Record<string, string> = {};
	if (typeof body.alt === 'string') updates.alt = body.alt.trim();
	if (typeof body.caption === 'string') updates.caption = body.caption.trim();
	if (typeof body.description === 'string') updates.description = body.description.trim();

	if (Object.keys(updates).length === 0) throw error(400, 'No updatable fields provided');

	const [updated] = await db
		.update(media)
		.set(updates)
		.where(eq(media.id, id))
		.returning();

	return json(updated);
};

// ─── DELETE /api/v1/media ─────────────────────────────────────────────────────
// Delete a media record by id. Auth required (upload_files capability).
// Query: ?id=<number>
// Note: removes the DB record only; physical files on disk are not deleted.

export const DELETE: RequestHandler = async (event) => {
	const authError = requireCapability(event, 'upload_files');
	if (authError) return authError;

	const { url } = event;

	const idParam = url.searchParams.get('id');
	const id = idParam ? Number(idParam) : NaN;
	if (!idParam || isNaN(id)) throw error(400, 'Query parameter "id" (number) is required');

	const existing = db
		.select({ id: media.id })
		.from(media)
		.where(eq(media.id, id))
		.get();
	if (!existing) throw error(404, `Media ${id} not found`);

	await db.delete(media).where(eq(media.id, id));

	return new Response(null, { status: 204 });
};
