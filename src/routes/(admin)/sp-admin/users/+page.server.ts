import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users, posts } from '$lib/server/db/schema.js';
import { eq, count, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ url, locals }) => {
	const roleFilter = url.searchParams.get('role') ?? '';

	const allUsers = db.select({
		id: users.id,
		username: users.username,
		email: users.email,
		displayName: users.displayName,
		role: users.role,
		avatar: users.avatar,
		registeredAt: users.registeredAt,
		lastLogin: users.lastLogin
	}).from(users).all();

	// Count posts per user
	const postCounts = db
		.select({ authorId: posts.authorId, cnt: count() })
		.from(posts)
		.where(eq(posts.postType, 'post'))
		.groupBy(posts.authorId)
		.all();

	const postCountMap: Record<number, number> = {};
	for (const row of postCounts) {
		postCountMap[row.authorId] = Number(row.cnt);
	}

	const enriched = allUsers
		.filter((u) => !roleFilter || u.role === roleFilter)
		.map((u) => ({ ...u, postCount: postCountMap[u.id] ?? 0 }));

	// Role counts for tabs
	const roleCounts: Record<string, number> = { all: allUsers.length };
	for (const u of allUsers) {
		roleCounts[u.role] = (roleCounts[u.role] ?? 0) + 1;
	}

	return {
		users: enriched,
		roleCounts,
		roleFilter,
		currentUserId: locals.user!.id
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Missing id.' });
		if (id === locals.user!.id) return fail(400, { error: 'You cannot delete your own account.' });

		await db.delete(users).where(eq(users.id, id));

		return { success: true };
	}
};
