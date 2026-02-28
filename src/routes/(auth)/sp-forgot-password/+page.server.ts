import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { sendEmail } from '$lib/server/email/index.js';

export const load: PageServerLoad = async () => ({ sent: false, devToken: '' });

export const actions: Actions = {
	default: async (event) => {
		const data = await event.request.formData();
		const email = String(data.get('email') ?? '').trim();

		if (!email || !email.includes('@')) {
			return fail(400, { error: 'Please enter a valid email address.' });
		}

		const user = db.select().from(users).where(eq(users.email, email)).get();

		// Always show success to prevent email enumeration
		if (!user) {
			return { sent: true, devToken: '', email };
		}

		const resetToken = nanoid(32);
		const resetUrl = `${event.url.origin}/sp-forgot-password?token=${resetToken}`;

		const result = await sendEmail({
			to: user.email,
			subject: 'Reset your SveltePress password',
			html: `
				<h2>Password Reset</h2>
				<p>Hi ${user.displayName},</p>
				<p>Click the link below to reset your password. This link expires in 1 hour.</p>
				<p><a href="${resetUrl}">${resetUrl}</a></p>
				<p>If you did not request this, you can safely ignore this email.</p>
			`,
			text: `Reset your SveltePress password\n\nHi ${user.displayName},\n\nReset your password: ${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`
		});

		if (!result.success) {
			console.error('[ForgotPassword] Email send failed:', result.error);
		}

		// In dev (ethereal), surface the preview URL so the developer can inspect the email.
		// In production with real SMTP, previewUrl will be undefined.
		const devToken = result.previewUrl ?? resetToken;

		return { sent: true, devToken, email };
	}
};
