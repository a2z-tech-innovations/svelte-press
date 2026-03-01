import type { JSONContent } from '@tiptap/core';
import type { Block } from '$lib/types/index.js';

export type ContentFormat = JSONContent | Block[] | null | undefined;

/**
 * Returns true when the content is a Tiptap JSON document.
 */
export function isTiptapDoc(content: ContentFormat): content is JSONContent {
	return (
		content !== null &&
		content !== undefined &&
		!Array.isArray(content) &&
		typeof content === 'object' &&
		(content as JSONContent).type === 'doc'
	);
}

/**
 * Returns true when the content is the legacy Block[] array format.
 */
export function isLegacyBlocks(content: ContentFormat): content is Block[] {
	return Array.isArray(content);
}

/**
 * Parse a raw JSON string (as stored in the DB) to either Tiptap JSON or Block[].
 * Returns null on failure.
 */
export function parseContent(raw: string | null | undefined): ContentFormat {
	if (!raw || raw === 'null') return null;
	try {
		const parsed = JSON.parse(raw);
		return parsed as ContentFormat;
	} catch {
		return null;
	}
}
