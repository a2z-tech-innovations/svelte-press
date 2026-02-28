import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { getPluginList } from '$lib/server/plugins/loader.js';
import { db } from '$lib/server/db/index.js';
import { options } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { logActivity } from '$lib/server/activity/index.js';

export const load: PageServerLoad = async () => {
	const plugins = getPluginList();
	return { plugins };
};

export const actions: Actions = {
	toggle: async ({ request, locals }) => {
		const data = await request.formData();
		const slug = String(data.get('slug') ?? '');
		const activate = data.get('activate') === '1';

		if (!slug) return fail(400, { error: 'Missing slug.' });

		const existing = db.select().from(options).where(eq(options.optionName, 'active_plugins')).get();
		const active: string[] = existing ? JSON.parse(existing.optionValue) : [];

		let updated: string[];
		if (activate) {
			updated = active.includes(slug) ? active : [...active, slug];
		} else {
			updated = active.filter((s) => s !== slug);
		}

		const newValue = JSON.stringify(updated);
		if (existing) {
			await db.update(options).set({ optionValue: newValue }).where(eq(options.optionName, 'active_plugins'));
		} else {
			await db.insert(options).values({ optionName: 'active_plugins', optionValue: newValue });
		}

		logActivity({
			userId: locals.user?.id,
			userDisplayName: locals.user?.displayName,
			action: activate ? 'plugin_activated' : 'plugin_deactivated',
			objectType: 'plugin',
			objectTitle: slug
		}).catch(() => {});

		return { success: true, action: activate ? 'activated' : 'deactivated', slug };
	}
};
