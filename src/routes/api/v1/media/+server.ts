import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { media } from '$lib/server/db/schema.js';
import { eq, and, count, desc, like } from 'drizzle-orm';

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
