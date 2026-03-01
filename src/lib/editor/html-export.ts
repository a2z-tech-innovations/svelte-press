import { generateHTML } from '@tiptap/html';
import type { JSONContent } from '@tiptap/core';

// Lazily-loaded extensions cache
let cachedExtensions: Parameters<typeof generateHTML>[1] | null = null;

async function loadExtensions() {
	if (cachedExtensions) return cachedExtensions;
	const { getExtensions } = await import('./extensions/index.js');
	cachedExtensions = getExtensions();
	return cachedExtensions;
}

/**
 * Convert a Tiptap JSON document to clean HTML.
 * Uses @tiptap/html — works in both browser and Node.js SSR.
 */
export function tiptapToHtml(doc: JSONContent, extensions: Parameters<typeof generateHTML>[1]): string {
	return generateHTML(doc, extensions);
}

/**
 * Async version that auto-loads extensions.
 */
export async function tiptapToHtmlAsync(doc: JSONContent): Promise<string> {
	const exts = await loadExtensions();
	return generateHTML(doc, exts);
}
