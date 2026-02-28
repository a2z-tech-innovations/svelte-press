import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { getThemeList } from '$lib/server/themes/index.js';
import { db } from '$lib/server/db/index.js';
import { options } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const themes = getThemeList();
	return { themes };
};

export const actions: Actions = {
	activate: async ({ request }) => {
		const data = await request.formData();
		const slug = String(data.get('slug') ?? '');
		if (!slug) return fail(400, { error: 'Missing theme slug.' });

		const existing = db.select().from(options).where(eq(options.optionName, 'active_theme')).get();
		if (existing) {
			await db.update(options).set({ optionValue: slug }).where(eq(options.optionName, 'active_theme'));
		} else {
			await db.insert(options).values({ optionName: 'active_theme', optionValue: slug });
		}

		return { success: true, activated: slug };
	}
};
