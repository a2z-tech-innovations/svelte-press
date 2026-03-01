import { describe, it, expect } from 'vitest';
import { can, requireCap } from '$lib/server/permissions/index.js';
import type { UserRole } from '$lib/types/index.js';

// ─── can() ───────────────────────────────────────────────────────────────────

describe('can()', () => {
	describe('admin role', () => {
		it('has the read capability', () => {
			expect(can('admin', 'read')).toBe(true);
		});

		it('can manage_options', () => {
			expect(can('admin', 'manage_options')).toBe(true);
		});

		it('can manage_users', () => {
			expect(can('admin', 'manage_users')).toBe(true);
		});

		it('can activate_plugins', () => {
			expect(can('admin', 'activate_plugins')).toBe(true);
		});

		it('can switch_themes', () => {
			expect(can('admin', 'switch_themes')).toBe(true);
		});

		it('can publish_posts', () => {
			expect(can('admin', 'publish_posts')).toBe(true);
		});

		it('can edit_others_posts', () => {
			expect(can('admin', 'edit_others_posts')).toBe(true);
		});

		it('can delete_others_posts', () => {
			expect(can('admin', 'delete_others_posts')).toBe(true);
		});

		it('can import', () => {
			expect(can('admin', 'import')).toBe(true);
		});

		it('can export', () => {
			expect(can('admin', 'export')).toBe(true);
		});
	});

	describe('editor role', () => {
		it('has the read capability', () => {
			expect(can('editor', 'read')).toBe(true);
		});

		it('can edit_posts', () => {
			expect(can('editor', 'edit_posts')).toBe(true);
		});

		it('can edit_others_posts', () => {
			expect(can('editor', 'edit_others_posts')).toBe(true);
		});

		it('can publish_posts', () => {
			expect(can('editor', 'publish_posts')).toBe(true);
		});

		it('can moderate_comments', () => {
			expect(can('editor', 'moderate_comments')).toBe(true);
		});

		it('can manage_categories', () => {
			expect(can('editor', 'manage_categories')).toBe(true);
		});

		it('can list_users but not manage_users', () => {
			expect(can('editor', 'list_users')).toBe(true);
			expect(can('editor', 'manage_users')).toBe(false);
		});

		it('cannot manage_options (admin-only)', () => {
			expect(can('editor', 'manage_options')).toBe(false);
		});

		it('cannot activate_plugins (admin-only)', () => {
			expect(can('editor', 'activate_plugins')).toBe(false);
		});

		it('cannot switch_themes (admin-only)', () => {
			expect(can('editor', 'switch_themes')).toBe(false);
		});
	});

	describe('author role', () => {
		it('has the read capability', () => {
			expect(can('author', 'read')).toBe(true);
		});

		it('can edit_posts', () => {
			expect(can('author', 'edit_posts')).toBe(true);
		});

		it('can publish_posts', () => {
			expect(can('author', 'publish_posts')).toBe(true);
		});

		it('can upload_files', () => {
			expect(can('author', 'upload_files')).toBe(true);
		});

		it('cannot delete_posts', () => {
			expect(can('author', 'delete_posts')).toBe(true);
		});

		it('cannot edit_others_posts', () => {
			expect(can('author', 'edit_others_posts')).toBe(false);
		});

		it('cannot moderate_comments', () => {
			expect(can('author', 'moderate_comments')).toBe(false);
		});

		it('cannot manage_options', () => {
			expect(can('author', 'manage_options')).toBe(false);
		});
	});

	describe('contributor role', () => {
		it('has the read capability', () => {
			expect(can('contributor', 'read')).toBe(true);
		});

		it('can edit_posts', () => {
			expect(can('contributor', 'edit_posts')).toBe(true);
		});

		it('cannot publish_posts', () => {
			expect(can('contributor', 'publish_posts')).toBe(false);
		});

		it('cannot upload_files', () => {
			expect(can('contributor', 'upload_files')).toBe(false);
		});

		it('cannot edit_others_posts', () => {
			expect(can('contributor', 'edit_others_posts')).toBe(false);
		});

		it('cannot delete_posts', () => {
			expect(can('contributor', 'delete_posts')).toBe(false);
		});
	});

	describe('subscriber role', () => {
		it('has the read capability', () => {
			expect(can('subscriber', 'read')).toBe(true);
		});

		it('cannot edit_posts', () => {
			expect(can('subscriber', 'edit_posts')).toBe(false);
		});

		it('cannot publish_posts', () => {
			expect(can('subscriber', 'publish_posts')).toBe(false);
		});

		it('cannot manage_options', () => {
			expect(can('subscriber', 'manage_options')).toBe(false);
		});

		it('cannot upload_files', () => {
			expect(can('subscriber', 'upload_files')).toBe(false);
		});
	});

	describe('null and undefined handling', () => {
		it('returns false for null role', () => {
			expect(can(null, 'read')).toBe(false);
		});

		it('returns false for undefined role', () => {
			expect(can(undefined, 'read')).toBe(false);
		});
	});

	describe('role hierarchy — admin is a strict superset of editor', () => {
		const editorCaps = [
			'read', 'edit_posts', 'edit_others_posts', 'publish_posts',
			'delete_posts', 'delete_others_posts', 'upload_files',
			'moderate_comments', 'manage_categories', 'manage_links',
			'edit_pages', 'publish_pages', 'delete_pages',
			'edit_others_pages', 'delete_others_pages', 'list_users', 'export'
		] as const;

		it('admin has every capability that editor has', () => {
			editorCaps.forEach((cap) => {
				expect(can('admin', cap)).toBe(true);
			});
		});
	});
});

// ─── requireCap() ────────────────────────────────────────────────────────────

describe('requireCap()', () => {
	it('does not throw when the role has the capability', () => {
		expect(() => requireCap('admin', 'manage_options')).not.toThrow();
	});

	it('does not throw for a basic capability any role has', () => {
		const roles: UserRole[] = ['admin', 'editor', 'author', 'contributor', 'subscriber'];
		roles.forEach((role) => {
			expect(() => requireCap(role, 'read')).not.toThrow();
		});
	});

	it('throws an Error when the role lacks the capability', () => {
		expect(() => requireCap('subscriber', 'manage_options')).toThrow(Error);
	});

	it('includes the missing capability name in the error message', () => {
		expect(() => requireCap('contributor', 'publish_posts')).toThrow('publish_posts');
	});

	it('throws for null role on any capability', () => {
		expect(() => requireCap(null, 'read')).toThrow(Error);
	});

	it('throws for undefined role on any capability', () => {
		expect(() => requireCap(undefined, 'read')).toThrow(Error);
	});

	it('throws for author attempting admin-only capabilities', () => {
		expect(() => requireCap('author', 'manage_options')).toThrow();
		expect(() => requireCap('author', 'activate_plugins')).toThrow();
		expect(() => requireCap('author', 'switch_themes')).toThrow();
	});
});
