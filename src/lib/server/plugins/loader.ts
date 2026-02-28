import { readdirSync, existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import type { PluginInfo } from '$lib/types/index.js';
import { db } from '../db/index.js';
import { options } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const PLUGINS_DIR = resolve('plugins');

export interface PluginModule {
	register: (hooks: import('./hooks.js').HookSystem) => void | Promise<void>;
	info: Omit<PluginInfo, 'slug' | 'active'>;
}

let loaded = false;

export async function loadPlugins(): Promise<void> {
	if (loaded) return;
	loaded = true;

	if (!existsSync(PLUGINS_DIR)) return;

	// Get active plugins from DB
	const row = await db
		.select()
		.from(options)
		.where(eq(options.optionName, 'active_plugins'))
		.limit(1);
	const activePlugins: string[] = row.length > 0 ? JSON.parse(row[0].optionValue) : [];

	const pluginDirs = readdirSync(PLUGINS_DIR, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name);

	const { hooks } = await import('./hooks.js');

	for (const slug of pluginDirs) {
		if (!activePlugins.includes(slug)) continue;

		const pluginFile = join(PLUGINS_DIR, slug, 'plugin.js');
		if (!existsSync(pluginFile)) continue;

		try {
			const mod: PluginModule = await import(/* @vite-ignore */ pluginFile);
			if (typeof mod.register === 'function') {
				await mod.register(hooks);
				console.log(`[plugins] loaded: ${slug}`);
			}
		} catch (err) {
			console.error(`[plugins] failed to load ${slug}:`, err);
		}
	}
}

export function getPluginList(): PluginInfo[] {
	if (!existsSync(PLUGINS_DIR)) return [];

	const row = db.select().from(options).where(eq(options.optionName, 'active_plugins')).all();
	const activePlugins: string[] = row.length > 0 ? JSON.parse(row[0].optionValue) : [];

	return readdirSync(PLUGINS_DIR, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => {
			const slug = d.name;
			const metaFile = join(PLUGINS_DIR, slug, 'plugin.json');
			const meta = existsSync(metaFile)
				? JSON.parse(readFileSync(metaFile, 'utf-8'))
				: { name: slug, version: '1.0.0', author: 'Unknown', description: '' };

			return {
				slug,
				name: meta.name ?? slug,
				version: meta.version ?? '1.0.0',
				author: meta.author ?? 'Unknown',
				description: meta.description ?? '',
				active: activePlugins.includes(slug)
			};
		});
}
