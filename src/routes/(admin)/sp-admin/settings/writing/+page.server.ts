import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { options, terms } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { logActivity } from '$lib/server/activity/index.js';

const OPTION_KEYS = ['default_category', 'default_post_format'];

export const load: PageServerLoad = async () => {
	const rows = db.select().from(options).all();
	const opts: Record<string, string> = {};
	for (const r of rows) opts[r.optionName] = r.optionValue;

	const categories = db.select({ id: terms.id, name: terms.name }).from(terms).where(eq(terms.taxonomy, 'category')).all();

	return { opts, categories };
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
			objectTitle: 'writing'
		}).catch(() => {});

		return { success: true };
	}
};
