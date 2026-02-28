import type { Handle } from '@sveltejs/kit';
import { validateSession, SESSION_COOKIE } from '$lib/server/auth/index.js';
import { loadPlugins } from '$lib/server/plugins/loader.js';
import { startScheduler } from '$lib/server/scheduler/index.js';

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

	// Validate session from cookie
	const sessionId = event.cookies.get(SESSION_COOKIE) ?? null;
	event.locals.sessionId = sessionId;
	event.locals.user = sessionId ? await validateSession(sessionId) : null;

	const response = await resolve(event);
	return response;
};
