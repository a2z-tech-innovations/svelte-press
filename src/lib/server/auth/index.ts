import { db } from '../db/index.js';
import { sessions, users } from '../db/schema.js';
import { eq, lt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { User } from '$lib/types/index.js';

const SESSION_COOKIE = 'sp_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export { SESSION_COOKIE };

export async function createSession(userId: number): Promise<string> {
	const id = nanoid(32);
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

	await db.insert(sessions).values({ id, userId, expiresAt });
	return id;
}

export async function validateSession(sessionId: string): Promise<User | null> {
	const now = new Date();

	const result = await db
		.select({
			session: sessions,
			user: users
		})
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, sessionId))
		.limit(1);

	if (result.length === 0) return null;

	const { session, user } = result[0];

	if (session.expiresAt < now) {
		await db.delete(sessions).where(eq(sessions.id, sessionId));
		return null;
	}

	return {
		id: user.id,
		username: user.username,
		email: user.email,
		displayName: user.displayName,
		bio: user.bio ?? '',
		avatar: user.avatar ?? '',
		role: user.role,
		registeredAt: user.registeredAt,
		lastLogin: user.lastLogin
	};
}

export async function deleteSession(sessionId: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function deleteExpiredSessions(): Promise<void> {
	await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
