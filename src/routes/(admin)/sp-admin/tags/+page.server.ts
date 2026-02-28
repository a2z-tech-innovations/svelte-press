import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { terms, postTerms } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { slugify } from '$lib/utils.js';

export const load: PageServerLoad = async () => {
	const tags = db
		.select({
			id: terms.id,
			name: terms.name,
			slug: terms.slug,
			description: terms.description,
			count: terms.count
		})
		.from(terms)
		.where(eq(terms.taxonomy, 'tag'))
		.all();

	return { tags };
};

export const actions: Actions = {
	add: async ({ request }) => {
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const slug = String(data.get('slug') ?? '').trim() || slugify(name);
		const description = String(data.get('description') ?? '');

		if (!name) return fail(400, { addError: 'Name is required.', name, slug, description });

		const existing = db.select({ id: terms.id }).from(terms)
			.where(and(eq(terms.slug, slug), eq(terms.taxonomy, 'tag'))).get();
		if (existing) return fail(400, { addError: 'A tag with this slug already exists.', name, slug, description });

		await db.insert(terms).values({ name, slug, description, taxonomy: 'tag', count: 0 });

		return { addSuccess: true };
	},

	update: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const name = String(data.get('name') ?? '').trim();
		const slug = String(data.get('slug') ?? '').trim() || slugify(name);
		const description = String(data.get('description') ?? '');

		if (!id || !name) return fail(400, { updateError: 'Name is required.', updateId: id });

		await db.update(terms).set({ name, slug, description }).where(eq(terms.id, id));

		return { updateSuccess: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { deleteError: 'Missing id.' });

		await db.delete(postTerms).where(eq(postTerms.termId, id));
		await db.delete(terms).where(eq(terms.id, id));

		return { deleteSuccess: true };
	}
};
