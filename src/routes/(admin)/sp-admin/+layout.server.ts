import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { options, comments } from '$lib/server/db/schema.js';
import { eq, count } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/sp-login');
	}

	// Load all autoload options
	const opts = db.select().from(options).where(eq(options.autoload, true)).all();
	const siteOptions: Record<string, string> = {};
	for (const opt of opts) {
		siteOptions[opt.optionName] = opt.optionValue;
	}

	// Pending comment count for badge
	const [{ count: pendingComments }] = db
		.select({ count: count() })
		.from(comments)
		.where(eq(comments.status, 'pending'))
		.all();

	return {
		user: locals.user,
		siteOptions,
		pendingComments: Number(pendingComments ?? 0)
	};
};
