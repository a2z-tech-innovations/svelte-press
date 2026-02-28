import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { widgets } from '$lib/server/db/schema.js';
import { eq, inArray } from 'drizzle-orm';

const WIDGET_AREAS = [
	{ id: 'sidebar', name: 'Primary Sidebar' },
	{ id: 'footer-1', name: 'Footer 1' },
	{ id: 'footer-2', name: 'Footer 2' }
];

const AVAILABLE_WIDGETS = [
	{ type: 'search', name: 'Search', description: 'A search form for your site.' },
	{ type: 'recent-posts', name: 'Recent Posts', description: 'Your site\'s most recent posts.' },
	{ type: 'recent-comments', name: 'Recent Comments', description: 'Your site\'s most recent comments.' },
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
	save: async ({ request }) => {
		const data = await request.formData();
		const area = String(data.get('area') ?? '');
		const widgetsRaw = String(data.get('widgets') ?? '[]');

		if (!area) return fail(400, { error: 'Missing area.' });

		let widgetData: Array<{ id?: number; type: string; settings: Record<string, unknown>; order: number }> = [];
		try {
			widgetData = JSON.parse(widgetsRaw);
		} catch {
			return fail(400, { error: 'Invalid widgets data.' });
		}

		// Delete existing widgets for area
		await db.delete(widgets).where(eq(widgets.area, area));

		// Insert new
		if (widgetData.length > 0) {
			await db.insert(widgets).values(
				widgetData.map((w, i) => ({
					area,
					widgetType: w.type,
					settings: w.settings ?? {},
					order: w.order ?? i
				}))
			);
		}

		return { success: true };
	},

	addWidget: async ({ request }) => {
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

	removeWidget: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Missing id.' });
		await db.delete(widgets).where(eq(widgets.id, id));
		return { success: true };
	}
};
