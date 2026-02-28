import { db } from '$lib/server/db/index.js';
import { activityLog } from '$lib/server/db/schema.js';

interface LogActivityOptions {
	userId?: number | null;
	userDisplayName?: string | null;
	action: string;
	objectType?: string;
	objectId?: number;
	objectTitle?: string;
	details?: Record<string, unknown>;
	ip?: string;
}

export async function logActivity(opts: LogActivityOptions): Promise<void> {
	try {
		await db.insert(activityLog).values({
			userId: opts.userId ?? null,
			userDisplayName: opts.userDisplayName ?? null,
			action: opts.action,
			objectType: opts.objectType ?? null,
			objectId: opts.objectId ?? null,
			objectTitle: opts.objectTitle ?? null,
			details: opts.details ? JSON.stringify(opts.details) : null,
			ip: opts.ip ?? null
		});
	} catch {
		// Never throw — logging must never break the main request
	}
}
