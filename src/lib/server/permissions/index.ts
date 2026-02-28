import type { UserRole } from '$lib/types/index.js';

type Capability =
	| 'read'
	| 'edit_posts'
	| 'edit_others_posts'
	| 'publish_posts'
	| 'delete_posts'
	| 'delete_others_posts'
	| 'upload_files'
	| 'moderate_comments'
	| 'manage_categories'
	| 'manage_links'
	| 'edit_pages'
	| 'publish_pages'
	| 'delete_pages'
	| 'edit_others_pages'
	| 'delete_others_pages'
	| 'manage_options'
	| 'manage_users'
	| 'list_users'
	| 'activate_plugins'
	| 'switch_themes'
	| 'install_plugins'
	| 'update_plugins'
	| 'install_themes'
	| 'update_themes'
	| 'export'
	| 'import';

const CAPABILITIES: Record<UserRole, Capability[]> = {
	admin: [
		'read',
		'edit_posts',
		'edit_others_posts',
		'publish_posts',
		'delete_posts',
		'delete_others_posts',
		'upload_files',
		'moderate_comments',
		'manage_categories',
		'manage_links',
		'edit_pages',
		'publish_pages',
		'delete_pages',
		'edit_others_pages',
		'delete_others_pages',
		'manage_options',
		'manage_users',
		'list_users',
		'activate_plugins',
		'switch_themes',
		'install_plugins',
		'update_plugins',
		'install_themes',
		'update_themes',
		'export',
		'import'
	],
	editor: [
		'read',
		'edit_posts',
		'edit_others_posts',
		'publish_posts',
		'delete_posts',
		'delete_others_posts',
		'upload_files',
		'moderate_comments',
		'manage_categories',
		'manage_links',
		'edit_pages',
		'publish_pages',
		'delete_pages',
		'edit_others_pages',
		'delete_others_pages',
		'list_users',
		'export'
	],
	author: ['read', 'edit_posts', 'publish_posts', 'delete_posts', 'upload_files'],
	contributor: ['read', 'edit_posts'],
	subscriber: ['read']
};

export function can(role: UserRole | undefined | null, capability: Capability): boolean {
	if (!role) return false;
	return CAPABILITIES[role]?.includes(capability) ?? false;
}

export function requireCap(role: UserRole | undefined | null, capability: Capability): void {
	if (!can(role, capability)) {
		throw new Error(`Insufficient permissions: requires ${capability}`);
	}
}
