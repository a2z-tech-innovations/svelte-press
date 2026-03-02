import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { terms } from '$lib/server/db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { requireCapability } from '$lib/server/api/auth.js';
import { slugify } from '$lib/utils.js';
import { nanoid } from 'nanoid';

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

	return json({ tags: rows });
};

// ─── POST /api/v1/tags ────────────────────────────────────────────────────────
// Create a new tag. Auth required (manage_categories capability).
// Body: { name, slug?, description? }

export const POST: RequestHandler = async (event) => {
	const authError = requireCapability(event, 'manage_categories');
	if (authError) return authError;

	const { request } = event;

	let body: {
		name?: unknown;
		slug?: unknown;
		description?: unknown;
	};

	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const name = typeof body.name === 'string' ? body.name.trim() : '';
	if (!name) throw error(400, 'Name is required');

	const description = typeof body.description === 'string' ? body.description.trim() : '';

	// Generate unique slug within tag taxonomy
	let slug = typeof body.slug === 'string' && body.slug.trim()
		? slugify(body.slug.trim())
		: slugify(name);

	const existingSlugs = db
		.select({ slug: terms.slug })
		.from(terms)
		.where(eq(terms.taxonomy, 'tag'))
		.all()
		.map((r) => r.slug);

	if (existingSlugs.includes(slug)) {
		slug = `${slug}-${nanoid(6)}`;
	}

	const [inserted] = await db
		.insert(terms)
		.values({
			name,
			slug,
			description,
			taxonomy: 'tag',
			parentId: null,
			count: 0
		})
		.returning();

	return json(inserted, { status: 201 });
};
