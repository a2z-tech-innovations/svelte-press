import type { Handle } from '@sveltejs/kit';
import { auth } from '$lib/auth.js';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { loadPlugins } from '$lib/server/plugins/loader.js';
import { startScheduler } from '$lib/server/scheduler/index.js';
import type { User } from '$lib/types/index.js';
import { building } from '$app/environment';

// One-time startup initialization
let initialized = false;
async function init() {
	if (initialized) return;
	initialized = true;
	await loadPlugins();
	startScheduler();
}

export const handle: Handle = async ({ event, resolve }) => {
	await init();

	// Get session from Better Auth, then populate locals with our User type.
	// All downstream code (permissions, api/auth.ts, admin layout guard) uses
	// event.locals.user which remains our User type — zero changes needed elsewhere.
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		const dbUser = db.select().from(users).where(eq(users.id, Number(session.user.id))).get();
		if (dbUser) {
			event.locals.user = {
				id: dbUser.id,
				username: dbUser.username,
				email: dbUser.email,
				displayName: dbUser.displayName,
				bio: dbUser.bio ?? '',
				avatar: dbUser.avatar ?? '',
				role: dbUser.role,
				registeredAt: dbUser.registeredAt,
				lastLogin: dbUser.lastLogin
			} satisfies User;
		} else {
			event.locals.user = null;
		}
		event.locals.sessionId = session.session.token;
	} else {
		event.locals.user = null;
		event.locals.sessionId = null;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};
