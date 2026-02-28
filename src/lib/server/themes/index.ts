import { readdirSync, existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import type { ThemeInfo } from '$lib/types/index.js';
import { db } from '../db/index.js';
import { options } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const THEMES_DIR = resolve('themes');

function readThemeMeta(slug: string): ThemeInfo {
	const metaFile = join(THEMES_DIR, slug, 'theme.json');
	const meta = existsSync(metaFile)
		? JSON.parse(readFileSync(metaFile, 'utf-8'))
		: {};

	return {
		slug,
		name: meta.name ?? slug,
		version: meta.version ?? '1.0.0',
		author: meta.author ?? 'Unknown',
		description: meta.description ?? '',
		screenshot: meta.screenshot ?? '',
		supports: meta.supports ?? [],
		menus: meta.menus ?? {},
		widgetAreas: meta.widget_areas ?? {},
		active: false
	};
}

export function getThemeList(): ThemeInfo[] {
	if (!existsSync(THEMES_DIR)) return [];

	const row = db.select().from(options).where(eq(options.optionName, 'active_theme')).all();
	const activeTheme: string = row.length > 0 ? row[0].optionValue : 'default';

	return readdirSync(THEMES_DIR, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => {
			const info = readThemeMeta(d.name);
			return { ...info, active: d.name === activeTheme };
		});
}

export function getActiveTheme(): ThemeInfo {
	const row = db.select().from(options).where(eq(options.optionName, 'active_theme')).all();
	const activeSlug: string = row.length > 0 ? row[0].optionValue : 'default';

	const info = readThemeMeta(activeSlug);
	return { ...info, active: true };
}

export function setActiveTheme(slug: string): void {
	db.update(options)
		.set({ optionValue: slug })
		.where(eq(options.optionName, 'active_theme'))
		.run();
}

export function getThemeCssUrl(slug: string): string {
	return `/themes/${slug}/style.css`;
}
