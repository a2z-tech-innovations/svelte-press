import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types.js';
import { auth } from '$lib/auth.js';

export const actions: Actions = {
	default: async (event) => {
		await auth.api.signOut({ headers: event.request.headers }).catch(() => {});
		redirect(302, '/sp-login');
	}
};

// GET logout also works
export const load = async (event) => {
	await auth.api.signOut({ headers: event.request.headers }).catch(() => {});
	redirect(302, '/sp-login');
};
