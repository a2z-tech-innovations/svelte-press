import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { menus, menuItems, posts, terms } from '$lib/server/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { slugify } from '$lib/utils.js';
import { nanoid } from 'nanoid';

export const load: PageServerLoad = async () => {
	const allMenus = db.select().from(menus).all();

	// Load items for each menu
	const menusWithItems = allMenus.map((menu) => {
		const items = db
			.select()
			.from(menuItems)
			.where(eq(menuItems.menuId, menu.id))
			.all()
			.sort((a, b) => a.order - b.order);
		return { ...menu, items };
	});

	const pages = db
		.select({ id: posts.id, title: posts.title })
		.from(posts)
		.where(and(eq(posts.postType, 'page'), sql`${posts.status} != 'trash'`))
		.all();

	const allPosts = db
		.select({ id: posts.id, title: posts.title })
		.from(posts)
		.where(and(eq(posts.postType, 'post'), eq(posts.status, 'publish')))
		.orderBy(posts.modifiedDate)
		.limit(50)
		.all();

	const categories = db
		.select({ id: terms.id, name: terms.name })
		.from(terms)
		.where(eq(terms.taxonomy, 'category'))
		.all();

	return { menus: menusWithItems, pages, posts: allPosts, categories };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'Menu name is required.' });

		const slug = slugify(name) || nanoid(8);
		const result = await db.insert(menus).values({ name, slug, location: '' }).returning({ id: menus.id });

		return { success: true, menuId: result[0].id };
	},

	save: async ({ request }) => {
		const data = await request.formData();
		const menuId = Number(data.get('menuId'));
		const itemsRaw = String(data.get('items') ?? '[]');

		if (!menuId) return fail(400, { error: 'Missing menu id.' });

		let items: Array<{ id?: number; title: string; url: string; order: number; parentId: number | null; postId: number | null; termId: number | null; target: string; classes: string }> = [];
		try {
			items = JSON.parse(itemsRaw);
		} catch {
			return fail(400, { error: 'Invalid items JSON.' });
		}

		// Delete all existing items
		await db.delete(menuItems).where(eq(menuItems.menuId, menuId));

		// Insert new items
		if (items.length > 0) {
			await db.insert(menuItems).values(
				items.map((item, idx) => ({
					menuId,
					title: item.title || '',
					url: item.url || '',
					postId: item.postId || null,
					termId: item.termId || null,
					order: item.order ?? idx,
					parentId: item.parentId || null,
					target: item.target || '',
					classes: item.classes || ''
				}))
			);
		}

		return { success: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const menuId = Number(data.get('menuId'));
		if (!menuId) return fail(400, { error: 'Missing menu id.' });

		await db.delete(menuItems).where(eq(menuItems.menuId, menuId));
		await db.delete(menus).where(eq(menus.id, menuId));

		return { success: true };
	}
};
