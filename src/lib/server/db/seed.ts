#!/usr/bin/env tsx
import { db } from './index.js';
import { users, options, terms } from './schema.js';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

function discoverPluginSlugs(): string[] {
	const pluginsDir = join(process.cwd(), 'plugins');
	if (!existsSync(pluginsDir)) return [];
	return readdirSync(pluginsDir, { withFileTypes: true })
		.filter((d) => d.isDirectory() && existsSync(join(pluginsDir, d.name, 'plugin.ts')))
		.map((d) => d.name);
}

async function seed() {
	console.log('Seeding database…');

	// ── Default admin user ──────────────────────────────────────────────────
	const existing = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
	if (existing.length === 0) {
		const passwordHash = await bcrypt.hash('password', 12);
		await db.insert(users).values({
			username: 'admin',
			email: 'admin@sveltepress.local',
			passwordHash,
			displayName: 'Administrator',
			role: 'admin'
		});
		console.log('  ✓ Created admin user (admin / password)');
	} else {
		console.log('  – Admin user already exists');
	}

	// ── Default options ─────────────────────────────────────────────────────
	const defaultActiveSlugs = discoverPluginSlugs();
	console.log(`  – Discovered plugins: [${defaultActiveSlugs.join(', ') || 'none'}]`);

	const defaults: Array<{ optionName: string; optionValue: string; autoload: boolean }> = [
		{ optionName: 'siteurl', optionValue: 'http://localhost:5173', autoload: true },
		{ optionName: 'blogname', optionValue: 'SveltePress', autoload: true },
		{ optionName: 'blogdescription', optionValue: 'Just another SveltePress site', autoload: true },
		{ optionName: 'admin_email', optionValue: 'admin@sveltepress.local', autoload: true },
		{ optionName: 'posts_per_page', optionValue: '10', autoload: true },
		{ optionName: 'date_format', optionValue: 'MMMM d, yyyy', autoload: true },
		{ optionName: 'time_format', optionValue: 'h:mm a', autoload: true },
		{ optionName: 'timezone', optionValue: 'UTC', autoload: true },
		{ optionName: 'active_theme', optionValue: 'default', autoload: true },
		{ optionName: 'active_plugins', optionValue: JSON.stringify(defaultActiveSlugs), autoload: true },
		{
			optionName: 'show_on_front',
			optionValue: 'posts',
			autoload: true
		} /* posts | page */,
		{ optionName: 'page_on_front', optionValue: '0', autoload: true },
		{ optionName: 'page_for_posts', optionValue: '0', autoload: true },
		{ optionName: 'permalink_structure', optionValue: '/%postname%/', autoload: true },
		{ optionName: 'comment_moderation', optionValue: '0', autoload: true },
		{ optionName: 'comment_registration', optionValue: '0', autoload: true },
		{ optionName: 'default_comment_status', optionValue: 'open', autoload: true },
		{ optionName: 'thumbnail_size_w', optionValue: '150', autoload: true },
		{ optionName: 'thumbnail_size_h', optionValue: '150', autoload: true },
		{ optionName: 'medium_size_w', optionValue: '300', autoload: true },
		{ optionName: 'medium_size_h', optionValue: '300', autoload: true },
		{ optionName: 'large_size_w', optionValue: '1024', autoload: true },
		{ optionName: 'large_size_h', optionValue: '1024', autoload: true },
		{ optionName: 'upload_path', optionValue: './static/uploads', autoload: true },
		{ optionName: 'default_category', optionValue: '1', autoload: true },
		{ optionName: 'default_post_format', optionValue: 'standard', autoload: true }
	];

	for (const opt of defaults) {
		await db
			.insert(options)
			.values(opt)
			.onConflictDoNothing({ target: options.optionName });
	}
	console.log('  ✓ Default options set');

	// ── Default category ────────────────────────────────────────────────────
	const existingCat = await db
		.select()
		.from(terms)
		.where(eq(terms.taxonomy, 'category'))
		.limit(1);
	if (existingCat.length === 0) {
		await db.insert(terms).values({
			name: 'Uncategorized',
			slug: 'uncategorized',
			taxonomy: 'category',
			description: ''
		});
		console.log('  ✓ Created "Uncategorized" category');
	} else {
		console.log('  – Default category already exists');
	}

	console.log('\nDone! Log in at /login with: admin / password');
}

seed().catch((err) => {
	console.error(err);
	process.exit(1);
});
