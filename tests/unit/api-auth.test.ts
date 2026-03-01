import { describe, it, expect, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { requireAuth, requireCapability } from '$lib/server/api/auth.js';
import type { User, UserRole } from '$lib/types/index.js';

// Mock @sveltejs/kit's json() to avoid any SvelteKit runtime dependencies
vi.mock('@sveltejs/kit', () => ({
	json: (data: unknown, init?: ResponseInit) =>
		new Response(JSON.stringify(data), {
			...init,
			headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) }
		})
}));

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeUser(role: UserRole): User {
	return {
		id: 1,
		username: 'testuser',
		email: 'test@example.com',
		displayName: 'Test User',
		bio: '',
		avatar: '',
		role,
		registeredAt: new Date(),
		lastLogin: null
	};
}

/** Builds a minimal RequestEvent stub with only the locals we need. */
function makeEvent(user: User | null): RequestEvent {
	return { locals: { user } } as unknown as RequestEvent;
}

// ─── requireAuth() ────────────────────────────────────────────────────────────

describe('requireAuth()', () => {
	it('returns null when the user is authenticated', () => {
		const event = makeEvent(makeUser('subscriber'));
		expect(requireAuth(event)).toBeNull();
	});

	it('returns a Response when the user is not authenticated', () => {
		const event = makeEvent(null);
		const result = requireAuth(event);
		expect(result).toBeInstanceOf(Response);
	});

	it('returns HTTP 401 when unauthenticated', () => {
		const result = requireAuth(makeEvent(null))!;
		expect(result.status).toBe(401);
	});

	it('returns a JSON body with an error message when unauthenticated', async () => {
		const result = requireAuth(makeEvent(null))!;
		const body = await result.json();
		expect(body).toHaveProperty('error');
		expect(body.error).toBe('Authentication required');
	});

	it('returns null for every role (any authenticated user passes)', () => {
		const roles: UserRole[] = ['admin', 'editor', 'author', 'contributor', 'subscriber'];
		for (const role of roles) {
			expect(requireAuth(makeEvent(makeUser(role)))).toBeNull();
		}
	});
});

// ─── requireCapability() ─────────────────────────────────────────────────────

describe('requireCapability()', () => {
	describe('unauthenticated requests', () => {
		it('returns HTTP 401 when the user is not set', () => {
			const result = requireCapability(makeEvent(null), 'edit_posts')!;
			expect(result.status).toBe(401);
		});

		it('returns a JSON error body when unauthenticated', async () => {
			const result = requireCapability(makeEvent(null), 'edit_posts')!;
			const body = await result.json();
			expect(body.error).toBe('Authentication required');
		});
	});

	describe('authorized requests', () => {
		it('returns null when the user has the required capability', () => {
			const event = makeEvent(makeUser('admin'));
			expect(requireCapability(event, 'manage_options')).toBeNull();
		});

		it('returns null for a basic capability every role has', () => {
			const roles: UserRole[] = ['admin', 'editor', 'author', 'contributor', 'subscriber'];
			for (const role of roles) {
				expect(requireCapability(makeEvent(makeUser(role)), 'read')).toBeNull();
			}
		});

		it('returns null for editor using edit_posts', () => {
			expect(requireCapability(makeEvent(makeUser('editor')), 'edit_posts')).toBeNull();
		});

		it('returns null for author using publish_posts', () => {
			expect(requireCapability(makeEvent(makeUser('author')), 'publish_posts')).toBeNull();
		});
	});

	describe('forbidden requests', () => {
		it('returns HTTP 403 when the user lacks the capability', () => {
			const result = requireCapability(makeEvent(makeUser('subscriber')), 'edit_posts')!;
			expect(result.status).toBe(403);
		});

		it('returns a JSON error body when forbidden', async () => {
			const result = requireCapability(makeEvent(makeUser('subscriber')), 'edit_posts')!;
			const body = await result.json();
			expect(body.error).toBe('Forbidden');
		});

		it('returns 403 for contributor attempting publish_posts', () => {
			const result = requireCapability(makeEvent(makeUser('contributor')), 'publish_posts')!;
			expect(result.status).toBe(403);
		});

		it('returns 403 for editor attempting admin-only manage_options', () => {
			const result = requireCapability(makeEvent(makeUser('editor')), 'manage_options')!;
			expect(result.status).toBe(403);
		});

		it('returns 403 for author attempting activate_plugins', () => {
			const result = requireCapability(makeEvent(makeUser('author')), 'activate_plugins')!;
			expect(result.status).toBe(403);
		});

		it('returns 403, not 401, when authenticated but missing capability', () => {
			// 401 = unauthenticated, 403 = authenticated but forbidden — must not be confused
			const result = requireCapability(makeEvent(makeUser('subscriber')), 'manage_users')!;
			expect(result.status).toBe(403);
			expect(result.status).not.toBe(401);
		});
	});
});
