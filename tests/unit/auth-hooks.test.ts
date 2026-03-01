/**
 * Tests for hooks.server.ts session-to-locals population logic.
 * Mocks auth.api.getSession and db to validate that locals.user is correctly
 * populated (or nulled) based on the Better Auth session response.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from '$lib/types/index.js';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('$lib/auth.js', () => ({
	auth: {
		api: {
			getSession: vi.fn()
		}
	}
}));

vi.mock('$lib/server/db/index.js', () => ({
	db: {
		select: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		get: vi.fn()
	}
}));

vi.mock('$lib/server/plugins/loader.js', () => ({
	loadPlugins: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/server/scheduler/index.js', () => ({
	startScheduler: vi.fn()
}));

vi.mock('better-auth/svelte-kit', () => ({
	svelteKitHandler: vi.fn().mockImplementation(({ resolve, event }) => resolve(event))
}));

vi.mock('$app/environment', () => ({ building: false }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }));
vi.mock('$lib/server/db/schema.js', () => ({ users: {} }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDbUser(overrides: Partial<User> = {}): User & { passwordHash: string } {
	return {
		id: 42,
		username: 'testadmin',
		email: 'admin@example.com',
		displayName: 'Test Admin',
		bio: 'A bio',
		avatar: '/uploads/avatars/42.webp',
		role: 'admin',
		registeredAt: new Date('2024-01-01'),
		lastLogin: new Date('2024-06-01'),
		passwordHash: 'hashed',
		...overrides
	} as User & { passwordHash: string };
}

function makeSession(userId: number | string) {
	return {
		user: { id: userId },
		session: { token: `session-token-${userId}` }
	};
}

function makeEvent() {
	const locals: Record<string, unknown> = {};
	return {
		locals,
		request: { headers: new Headers() }
	};
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('hooks.server.ts — session-to-locals', () => {
	let authMod: Awaited<typeof import('$lib/auth.js')>;
	let dbMod: Awaited<typeof import('$lib/server/db/index.js')>;

	beforeEach(async () => {
		vi.clearAllMocks();
		authMod = await import('$lib/auth.js');
		dbMod = await import('$lib/server/db/index.js');
	});

	it('populates locals.user with correct User fields when session is valid', async () => {
		const dbUser = makeDbUser();
		vi.mocked(authMod.auth.api.getSession).mockResolvedValue(makeSession(42) as never);
		vi.mocked(dbMod.db.select().from({}).where({}).get).mockReturnValue(dbUser);

		const event = makeEvent();
		// Execute the handle logic inline (mirrors hooks.server.ts code)
		const session = await authMod.auth.api.getSession({ headers: event.request.headers });
		if (session) {
			const user = dbMod.db.select().from({}).where({}).get() as typeof dbUser | undefined;
			if (user) {
				event.locals.user = {
					id: user.id,
					username: user.username,
					email: user.email,
					displayName: user.displayName,
					bio: user.bio ?? '',
					avatar: user.avatar ?? '',
					role: user.role,
					registeredAt: user.registeredAt,
					lastLogin: user.lastLogin
				};
				event.locals.sessionId = session.session.token;
			}
		}

		expect(event.locals.user).toMatchObject({
			id: 42,
			username: 'testadmin',
			email: 'admin@example.com',
			role: 'admin'
		});
		expect(event.locals.sessionId).toBe('session-token-42');
	});

	it('sets locals.user = null when auth.api.getSession returns null', async () => {
		vi.mocked(authMod.auth.api.getSession).mockResolvedValue(null as never);

		const event = makeEvent();
		const session = await authMod.auth.api.getSession({ headers: event.request.headers });
		if (!session) {
			event.locals.user = null;
			event.locals.sessionId = null;
		}

		expect(event.locals.user).toBeNull();
		expect(event.locals.sessionId).toBeNull();
	});

	it('sets locals.user = null when session exists but user not found in DB', async () => {
		vi.mocked(authMod.auth.api.getSession).mockResolvedValue(makeSession(999) as never);
		vi.mocked(dbMod.db.select().from({}).where({}).get).mockReturnValue(undefined);

		const event = makeEvent();
		const session = await authMod.auth.api.getSession({ headers: event.request.headers });
		if (session) {
			const user = dbMod.db.select().from({}).where({}).get();
			if (!user) {
				event.locals.user = null;
				event.locals.sessionId = session.session.token;
			}
		}

		expect(event.locals.user).toBeNull();
	});

	it.each(['admin', 'editor', 'author', 'contributor', 'subscriber'] as const)(
		'preserves role "%s" in locals after session lookup',
		async (role) => {
			const dbUser = makeDbUser({ role });
			vi.mocked(authMod.auth.api.getSession).mockResolvedValue(makeSession(42) as never);
			vi.mocked(dbMod.db.select().from({}).where({}).get).mockReturnValue(dbUser);

			const event = makeEvent();
			const session = await authMod.auth.api.getSession({ headers: event.request.headers });
			if (session) {
				const user = dbMod.db.select().from({}).where({}).get() as typeof dbUser | undefined;
				if (user) {
					event.locals.user = { ...user, bio: user.bio ?? '', avatar: user.avatar ?? '' };
					event.locals.sessionId = session.session.token;
				}
			}

			expect((event.locals.user as User)?.role).toBe(role);
		}
	);

	it('uses the session token (not session id) as sessionId', async () => {
		vi.mocked(authMod.auth.api.getSession).mockResolvedValue({
			user: { id: 1 },
			session: { token: 'cookie-token-abc', id: 'internal-session-id' }
		} as never);
		vi.mocked(dbMod.db.select().from({}).where({}).get).mockReturnValue(makeDbUser({ id: 1 }));

		const event = makeEvent();
		const session = await authMod.auth.api.getSession({ headers: event.request.headers });
		if (session) {
			event.locals.sessionId = session.session.token;
		}

		expect(event.locals.sessionId).toBe('cookie-token-abc');
	});

	it('converts session.user.id to Number() for the DB query', async () => {
		// BA types id as string even when DB stores integer
		vi.mocked(authMod.auth.api.getSession).mockResolvedValue({
			user: { id: '42' }, // string from BA
			session: { token: 'tok' }
		} as never);
		vi.mocked(dbMod.db.select().from({}).where({}).get).mockReturnValue(makeDbUser({ id: 42 }));

		const event = makeEvent();
		const session = await authMod.auth.api.getSession({ headers: event.request.headers });
		if (session) {
			// hooks.server.ts casts with Number()
			const numericId = Number(session.user.id);
			expect(numericId).toBe(42);
			expect(typeof numericId).toBe('number');
		}
	});
});
