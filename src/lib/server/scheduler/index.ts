import { db } from '../db/index.js';
import { posts } from '../db/schema.js';
import { eq, lte, and } from 'drizzle-orm';

let schedulerStarted = false;

export function startScheduler(): void {
	if (schedulerStarted) return;
	schedulerStarted = true;

	// Run every minute
	setInterval(publishScheduledPosts, 60_000);
	// Run once immediately on startup
	publishScheduledPosts();
}

async function publishScheduledPosts(): Promise<void> {
	try {
		const now = new Date();
		const due = await db
			.select({ id: posts.id })
			.from(posts)
			.where(and(eq(posts.status, 'future'), lte(posts.postDate, now)));

		if (due.length === 0) return;

		for (const { id } of due) {
			await db
				.update(posts)
				.set({ status: 'publish', modifiedDate: now })
				.where(eq(posts.id, id));
		}

		console.log(`[scheduler] published ${due.length} scheduled post(s)`);
	} catch (err) {
		console.error('[scheduler] error:', err);
	}
}
