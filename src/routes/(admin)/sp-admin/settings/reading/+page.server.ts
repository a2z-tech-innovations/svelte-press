import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { options, posts } from '$lib/server/db/schema.js';
import { eq, and, ne } from 'drizzle-orm';
import { logActivity } from '$lib/server/activity/index.js';

const OPTION_KEYS = [
	'show_on_front',
	'page_on_front',
	'page_for_posts',
	'posts_per_page',
	'posts_per_rss',
	'rss_use_excerpt'
];

export const load: PageServerLoad = async () => {
	const rows = db.select().from(options).all();
	const opts: Record<string, string> = {};
	for (const r of rows) opts[r.optionName] = r.optionValue;

	const pages = db
		.select({ id: posts.id, title: posts.title })
		.from(posts)
		.where(and(eq(posts.postType, 'page'), ne(posts.status, 'trash')))
		.all();

	return { opts, pages };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const data = await request.formData();

		for (const key of OPTION_KEYS) {
			const value = String(data.get(key) ?? '');
			const existing = db.select().from(options).where(eq(options.optionName, key)).get();
			if (existing) {
				await db.update(options).set({ optionValue: value }).where(eq(options.optionName, key));
			} else {
				await db.insert(options).values({ optionName: key, optionValue: value });
			}
		}

		logActivity({
			userId: locals.user?.id,
			userDisplayName: locals.user?.displayName,
			action: 'settings_updated',
			objectType: 'settings',
			objectTitle: 'reading'
		}).catch(() => {});

		return { success: true };
	}
};
