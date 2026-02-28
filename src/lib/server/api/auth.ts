import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { can } from '$lib/server/permissions/index.js';
import type { UserRole } from '$lib/types/index.js';

type Capability = Parameters<typeof can>[1];

/**
 * Returns a 401 JSON response if the request is not authenticated,
 * otherwise returns null (meaning the caller may proceed).
 *
 * Usage:
 *   const authError = requireAuth(event);
 *   if (authError) return authError;
 */
export function requireAuth(event: RequestEvent): Response | null {
	if (!event.locals.user) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}
	return null;
}

/**
 * Returns a 401 or 403 JSON response if the request is not authenticated
 * or if the authenticated user lacks the required capability,
 * otherwise returns null (meaning the caller may proceed).
 *
 * Usage:
 *   const authError = requireCapability(event, 'edit_posts');
 *   if (authError) return authError;
 */
export function requireCapability(event: RequestEvent, capability: Capability): Response | null {
	if (!event.locals.user) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}
	if (!can(event.locals.user.role as UserRole, capability)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}
	return null;
}
