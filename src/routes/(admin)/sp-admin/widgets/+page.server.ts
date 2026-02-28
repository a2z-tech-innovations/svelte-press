import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { widgets } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { can } from '$lib/server/permissions/index.js';

const WIDGET_AREAS = [
	{ id: 'sidebar', name: 'Primary Sidebar' },
	{ id: 'footer-1', name: 'Footer 1' },
	{ id: 'footer-2', name: 'Footer 2' }
];

const AVAILABLE_WIDGETS = [
	{ type: 'search', name: 'Search', description: 'A search form for your site.' },
	{ type: 'recent-posts', name: 'Recent Posts', description: "Your site's most recent posts." },
	{
		type: 'recent-comments',
		name: 'Recent Comments',
		description: "Your site's most recent comments."
	},
	{ type: 'archives', name: 'Archives', description: 'A monthly archive of your posts.' },
	{ type: 'categories', name: 'Categories', description: 'A list or dropdown of categories.' },
	{ type: 'tag-cloud', name: 'Tag Cloud', description: 'A cloud of your most used tags.' },
	{ type: 'text', name: 'Text', description: 'Arbitrary text or HTML.' },
	{ type: 'custom-html', name: 'Custom HTML', description: 'Arbitrary HTML code.' }
];

export const load: PageServerLoad = async () => {
	const allWidgets = db.select().from(widgets).all().sort((a, b) => a.order - b.order);

	const widgetsByArea: Record<string, typeof allWidgets> = {};
	for (const area of WIDGET_AREAS) {
		widgetsByArea[area.id] = allWidgets.filter((w) => w.area === area.id);
	}

	return { widgetAreas: WIDGET_AREAS, availableWidgets: AVAILABLE_WIDGETS, widgetsByArea };
};

export const actions: Actions = {
	// Add a widget to an area
	addWidget: async ({ request, locals }) => {
		if (!locals.user || !can(locals.user.role, 'manage_options')) {
			return fail(403, { error: 'Forbidden.' });
		}
		const data = await request.formData();
		const area = String(data.get('area') ?? '');
		const widgetType = String(data.get('widgetType') ?? '');

		if (!area || !widgetType) return fail(400, { error: 'Missing fields.' });

		const existing = db.select().from(widgets).where(eq(widgets.area, area)).all();
		const maxOrder = existing.reduce((max, w) => Math.max(max, w.order), -1);

		await db.insert(widgets).values({
			area,
			widgetType,
			settings: { title: '' },
			order: maxOrder + 1
		});

		return { success: true };
	},

	// Remove a single widget by id
	removeWidget: async ({ request, locals }) => {
		if (!locals.user || !can(locals.user.role, 'manage_options')) {
			return fail(403, { error: 'Forbidden.' });
		}
		const data = await request.formData();
		const id = Number(data.get('widgetId'));
		if (!id) return fail(400, { error: 'Missing widgetId.' });
		await db.delete(widgets).where(eq(widgets.id, id));
		return { success: true };
	},

	// Save widget settings (title, content, count, etc.)
	saveWidget: async ({ request, locals }) => {
		if (!locals.user || !can(locals.user.role, 'manage_options')) {
			return fail(403, { error: 'Forbidden.' });
		}
		const data = await request.formData();
		const id = Number(data.get('widgetId'));
		const settingsRaw = String(data.get('settings') ?? '{}');
		if (!id) return fail(400, { error: 'Missing widgetId.' });

		let settings: Record<string, unknown> = {};
		try {
			settings = JSON.parse(settingsRaw);
		} catch {
			return fail(400, { error: 'Invalid settings JSON.' });
		}

		await db.update(widgets).set({ settings }).where(eq(widgets.id, id));
		return { success: true };
	},

	// Reorder widgets in one area after a DnD drop or up/down click
	reorderWidgets: async ({ request, locals }) => {
		if (!locals.user || !can(locals.user.role, 'manage_options')) {
			return fail(403, { error: 'Forbidden.' });
		}
		const data = await request.formData();
		const orderedIds = data
			.getAll('ids')
			.map(Number)
			.filter((n) => n > 0);

		for (let i = 0; i < orderedIds.length; i++) {
			await db.update(widgets).set({ order: i + 1 }).where(eq(widgets.id, orderedIds[i]));
		}
		return { success: true };
	}
};
