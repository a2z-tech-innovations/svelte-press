import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users, account } from '$lib/server/db/schema.js';
import { eq, and, count, asc } from 'drizzle-orm';
import { requireCapability } from '$lib/server/api/auth.js';
import bcrypt from 'bcryptjs';

// ─── GET /api/v1/users ────────────────────────────────────────────────────────
// List users. Auth required (manage_users capability). Supports ?role= filter.
// Returns users without password_hash.

export const GET: RequestHandler = async (event) => {
	const authError = requireCapability(event, 'manage_users');
	if (authError) return authError;

	const { url } = event;

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

	return json({ users: rows, total, page, perPage, totalPages }, {
		headers: {
			'X-Total': String(total),
			'X-Total-Pages': String(totalPages),
			'Access-Control-Expose-Headers': 'X-Total, X-Total-Pages'
		}
	});
};

// ─── POST /api/v1/users ───────────────────────────────────────────────────────
// Create a new user. Auth required (manage_users capability).
// Body: { username, email, password, displayName?, role? }

export const POST: RequestHandler = async (event) => {
	const authError = requireCapability(event, 'manage_users');
	if (authError) return authError;

	const { request } = event;

	let body: {
		username?: unknown;
		email?: unknown;
		password?: unknown;
		displayName?: unknown;
		role?: unknown;
	};

	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const username = typeof body.username === 'string' ? body.username.trim() : '';
	if (!username) throw error(400, 'username is required');
	if (!/^[a-z0-9_.-]+$/i.test(username)) throw error(400, 'username contains invalid characters');

	const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
	if (!email || !email.includes('@')) throw error(400, 'Valid email is required');

	const password = typeof body.password === 'string' ? body.password : '';
	if (password.length < 8) throw error(400, 'Password must be at least 8 characters');

	const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : username;

	const allowedRoles = ['admin', 'editor', 'author', 'contributor', 'subscriber'] as const;
	type UserRole = (typeof allowedRoles)[number];
	const rawRole = typeof body.role === 'string' ? body.role : 'subscriber';
	const role: UserRole = allowedRoles.includes(rawRole as UserRole)
		? (rawRole as UserRole)
		: 'subscriber';

	// Check for existing username / email
	const existingUsername = db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.username, username))
		.get();
	if (existingUsername) throw error(409, 'Username already exists');

	const existingEmail = db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, email))
		.get();
	if (existingEmail) throw error(409, 'Email already exists');

	const passwordHash = await bcrypt.hash(password, 12);

	const [inserted] = await db
		.insert(users)
		.values({ username, email, passwordHash, displayName, role })
		.returning({
			id: users.id,
			username: users.username,
			email: users.email,
			displayName: users.displayName,
			role: users.role,
			registeredAt: users.registeredAt
		});

	// Create Better Auth account record so the user can sign in with their password
	await db.insert(account).values({
		id: crypto.randomUUID(),
		userId: inserted.id,
		accountId: String(inserted.id),
		providerId: 'credential',
		password: passwordHash,
		createdAt: new Date(),
		updatedAt: new Date()
	});

	return json(inserted, { status: 201 });
};
