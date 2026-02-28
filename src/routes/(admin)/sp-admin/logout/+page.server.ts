import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types.js';
import { deleteSession, SESSION_COOKIE } from '$lib/server/auth/index.js';

export const actions: Actions = {
	default: async ({ cookies, locals }) => {
		if (locals.sessionId) {
			await deleteSession(locals.sessionId);
		}
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(302, '/sp-login');
	}
};

// GET logout also works
export const load = async ({ cookies, locals }) => {
	if (locals.sessionId) {
		await deleteSession(locals.sessionId);
	}
	cookies.delete(SESSION_COOKIE, { path: '/' });
	redirect(302, '/sp-login');
};
