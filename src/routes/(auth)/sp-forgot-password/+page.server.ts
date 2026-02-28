import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const load: PageServerLoad = async () => ({ sent: false, devToken: '' });

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim();

		if (!email || !email.includes('@')) {
			return fail(400, { error: 'Please enter a valid email address.' });
		}

		const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

		// Always show success to prevent email enumeration
		const devToken = user ? nanoid(32) : '';
		// In production you'd email this token. For dev, we surface it in the UI.
		return { sent: true, devToken, email };
	}
};
