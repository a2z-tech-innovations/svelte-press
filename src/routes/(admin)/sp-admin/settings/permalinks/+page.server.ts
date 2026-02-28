import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { options } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

const OPTION_KEYS = ['permalink_structure', 'category_base', 'tag_base'];

export const load: PageServerLoad = async () => {
	const rows = db.select().from(options).all();
	const opts: Record<string, string> = {};
	for (const r of rows) opts[r.optionName] = r.optionValue;

	return { opts };
};

export const actions: Actions = {
	save: async ({ request }) => {
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

		return { success: true };
	}
};
