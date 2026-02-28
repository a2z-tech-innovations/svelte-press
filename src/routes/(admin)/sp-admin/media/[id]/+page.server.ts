import { fail, error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { media } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	if (!id) error(404, 'Media not found');

	const item = db.select().from(media).where(eq(media.id, id)).get();
	if (!item) error(404, 'Media not found');

	return { item };
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const id = Number(params.id);
		const data = await request.formData();
		const alt = String(data.get('alt') ?? '');
		const caption = String(data.get('caption') ?? '');
		const description = String(data.get('description') ?? '');
		const originalName = String(data.get('title') ?? '');

		await db.update(media).set({ alt, caption, description, originalName }).where(eq(media.id, id));

		return { success: true };
	},

	delete: async ({ params }) => {
		const id = Number(params.id);
		const item = db.select().from(media).where(eq(media.id, id)).get();
		if (!item) return fail(404, { error: 'Not found.' });

		// Delete main file
		const mainPath = join('static', item.path);
		if (existsSync(mainPath)) {
			try { unlinkSync(mainPath); } catch { /* ignore */ }
		}

		// Delete generated sizes
		for (const sizePath of Object.values(item.sizes ?? {})) {
			const p = join('static', sizePath);
			if (existsSync(p)) {
				try { unlinkSync(p); } catch { /* ignore */ }
			}
		}

		await db.delete(media).where(eq(media.id, id));

		redirect(302, '/sp-admin/media');
	}
};
