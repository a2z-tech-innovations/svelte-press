import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { options } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { logActivity } from '$lib/server/activity/index.js';

const OPTION_KEYS = [
	'default_pingback_flag',
	'default_ping_status',
	'default_comment_status',
	'require_name_email',
	'comment_registration',
	'close_comments_for_old_posts',
	'close_comments_days_old',
	'thread_comments',
	'thread_comments_depth',
	'page_comments',
	'comments_per_page',
	'default_comments_page',
	'comment_order',
	'comments_notify',
	'moderation_notify',
	'comment_moderation',
	'comment_whitelist',
	'moderation_keys',
	'blacklist_keys',
	'show_avatars',
	'avatar_default'
];

export const load: PageServerLoad = async () => {
	const rows = db.select().from(options).all();
	const opts: Record<string, string> = {};
	for (const r of rows) opts[r.optionName] = r.optionValue;

	return { opts };
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
			objectTitle: 'discussion'
		}).catch(() => {});

		return { success: true };
	}
};
