import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { auth } from '$lib/auth.js';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');
	return { sent: false, devToken: '', token };
};

export const actions: Actions = {
	// Step 1: user enters email to request a reset link
	requestReset: async (event) => {
		const data = await event.request.formData();
		const email = String(data.get('email') ?? '').trim();

		if (!email || !email.includes('@')) {
			return fail(400, { error: 'Please enter a valid email address.' });
		}

		// BA handles token generation, email sending, and token storage
		// Always show success to prevent email enumeration
		await auth.api
			.requestPasswordReset({
				body: {
					email,
					// BA will append ?token=... to this URL in the reset email
					redirectTo: `${event.url.origin}/sp-forgot-password`
				},
				headers: event.request.headers
			})
			.catch(() => {}); // fire-and-forget — errors don't leak to user

		return { sent: true, devToken: '', email };
	},

	// Step 2: user clicks reset link (?token=...) and sets new password
	resetPassword: async (event) => {
		const data = await event.request.formData();
		const token = String(data.get('token') ?? '').trim();
		const newPassword = String(data.get('newPassword') ?? '');
		const confirmPassword = String(data.get('confirmPassword') ?? '');

		if (!token) {
			return fail(400, { resetError: 'Invalid or missing reset token.' });
		}
		if (!newPassword || newPassword.length < 8) {
			return fail(400, { resetError: 'Password must be at least 8 characters.' });
		}
		if (newPassword !== confirmPassword) {
			return fail(400, { resetError: 'Passwords do not match.' });
		}

		try {
			await auth.api.resetPassword({
				body: { newPassword, token },
				headers: event.request.headers
			});
		} catch {
			return fail(400, { resetError: 'Invalid or expired reset token. Please request a new link.' });
		}

		redirect(302, '/sp-login');
	}
};
