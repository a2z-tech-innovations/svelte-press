import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { terms } from '$lib/server/db/schema.js';
import { eq, asc } from 'drizzle-orm';

// ─── GET /api/v1/tags ─────────────────────────────────────────────────────────
// Public. List all tags. Returns { id, name, slug, count }.

export const GET: RequestHandler = async () => {
	const rows = db
		.select({
			id: terms.id,
			name: terms.name,
			slug: terms.slug,
			count: terms.count
		})
		.from(terms)
		.where(eq(terms.taxonomy, 'tag'))
		.orderBy(asc(terms.name))
		.all();

	return json(rows);
};
