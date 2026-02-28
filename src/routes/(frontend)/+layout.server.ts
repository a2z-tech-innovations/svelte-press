import type { LayoutServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { options, menus, menuItems } from '$lib/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { getActiveThemeStyleUrl } from '$lib/server/themes/index.js';

export const load: LayoutServerLoad = async () => {
	// Load site options
	const allOptions = db.select().from(options).all();
	const optMap: Record<string, string> = {};
	for (const opt of allOptions) {
		optMap[opt.optionName] = opt.optionValue;
	}

	const siteName = optMap['blogname'] ?? 'SveltePress';
	const siteDescription = optMap['blogdescription'] ?? '';
	const activeTheme = optMap['active_theme'] ?? 'default';
	const permalinkStructure = optMap['permalink_structure'] ?? '/%postname%/';

	// Load primary menu
	const primaryMenu = db
		.select()
		.from(menus)
		.where(eq(menus.location, 'primary'))
		.get();

	let navMenuItems: Array<{
		id: number;
		title: string;
		url: string;
		order: number;
		parentId: number | null;
		target: string;
	}> = [];

	if (primaryMenu) {
		const items = db
			.select({
				id: menuItems.id,
				title: menuItems.title,
				url: menuItems.url,
				order: menuItems.order,
				parentId: menuItems.parentId,
				target: menuItems.target
			})
			.from(menuItems)
			.where(eq(menuItems.menuId, primaryMenu.id))
			.all();

		navMenuItems = items
			.map((item) => ({
				id: item.id,
				title: item.title,
				url: item.url ?? '',
				order: item.order,
				parentId: item.parentId ?? null,
				target: item.target ?? ''
			}))
			.sort((a, b) => a.order - b.order);
	}

	const themeSlug = activeTheme;
	const themeCssUrl = getActiveThemeStyleUrl(themeSlug);

	// Archive months: distinct year/month combos with published post counts
	type ArchiveMonthRow = { year: string; month: string; count: number };
	const archiveMonths = db.all<ArchiveMonthRow>(sql`
		SELECT
			strftime('%Y', datetime(post_date, 'unixepoch')) AS year,
			strftime('%m', datetime(post_date, 'unixepoch')) AS month,
			COUNT(*) AS count
		FROM posts
		WHERE status = 'publish' AND post_type = 'post' AND post_date IS NOT NULL
		GROUP BY year, month
		ORDER BY year DESC, month DESC
		LIMIT 12
	`);

	return {
		siteName,
		siteDescription,
		activeTheme,
		themeSlug,
		themeCssUrl,
		menuItems: navMenuItems,
		archiveMonths,
		permalinkStructure
	};
};
