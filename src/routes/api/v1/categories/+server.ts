import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { terms } from '$lib/server/db/schema.js';
import { eq, and, asc } from 'drizzle-orm';
import { can } from '$lib/server/permissions/index.js';
import { slugify } from '$lib/utils.js';
import { nanoid } from 'nanoid';

// ─── GET /api/v1/categories ───────────────────────────────────────────────────
// Public. List all categories. Returns { id, name, slug, description, parentId, count }.

export const GET: RequestHandler = async () => {
	const rows = db
		.select({
			id: terms.id,
			name: terms.name,
			slug: terms.slug,
			description: terms.description,
			parentId: terms.parentId,
			count: terms.count
		})
		.from(terms)
		.where(eq(terms.taxonomy, 'category'))
		.orderBy(asc(terms.name))
		.all();

	return json(rows);
};

// ─── POST /api/v1/categories ──────────────────────────────────────────────────
// Create a new category. Auth required (manage_categories capability).
// Body: { name, slug?, description?, parentId? }

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Authentication required');
	if (!can(locals.user.role, 'manage_categories')) throw error(403, 'Forbidden');

	let body: {
		name?: unknown;
		slug?: unknown;
		description?: unknown;
		parentId?: unknown;
	};

	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const name = typeof body.name === 'string' ? body.name.trim() : '';
	if (!name) throw error(400, 'Name is required');

	const description = typeof body.description === 'string' ? body.description.trim() : '';
	const parentId = typeof body.parentId === 'number' ? body.parentId : null;

	// Validate parent exists and is a category
	if (parentId !== null) {
		const parent = db
			.select({ id: terms.id })
			.from(terms)
			.where(and(eq(terms.id, parentId), eq(terms.taxonomy, 'category')))
			.get();
		if (!parent) throw error(400, `Parent category with id ${parentId} does not exist`);
	}

	// Generate unique slug within category taxonomy
	let slug = typeof body.slug === 'string' && body.slug.trim()
		? slugify(body.slug.trim())
		: slugify(name);

	const existingSlugs = db
		.select({ slug: terms.slug })
		.from(terms)
		.where(eq(terms.taxonomy, 'category'))
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
			taxonomy: 'category',
			parentId,
			count: 0
		})
		.returning();

	return json(inserted, { status: 201 });
};
