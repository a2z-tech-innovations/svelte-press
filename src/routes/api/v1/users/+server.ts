import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq, and, count, asc } from 'drizzle-orm';
import { can } from '$lib/server/permissions/index.js';

// ─── GET /api/v1/users ────────────────────────────────────────────────────────
// List users. Auth required (manage_users capability). Supports ?role= filter.
// Returns users without password_hash.

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Authentication required');
	if (!can(locals.user.role, 'manage_users')) throw error(403, 'Forbidden');

	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
	const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get('per_page') ?? 20)));
	const offset = (page - 1) * perPage;
	const roleFilter = url.searchParams.get('role')?.trim() ?? '';

	const allowedRoles = ['admin', 'editor', 'author', 'contributor', 'subscriber'] as const;
	type UserRole = (typeof allowedRoles)[number];

	const conditions = [];

	if (roleFilter && allowedRoles.includes(roleFilter as UserRole)) {
		conditions.push(eq(users.role, roleFilter as UserRole));
	}

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [{ total }] = db
		.select({ total: count() })
		.from(users)
		.where(where)
		.all();

	const rows = db
		.select({
			id: users.id,
			username: users.username,
			email: users.email,
			displayName: users.displayName,
			bio: users.bio,
			avatar: users.avatar,
			role: users.role,
			registeredAt: users.registeredAt,
			lastLogin: users.lastLogin
		})
		.from(users)
		.where(where)
		.orderBy(asc(users.registeredAt))
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
