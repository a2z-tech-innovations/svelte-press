/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import {
	isTiptapDoc,
	isLegacyBlocks,
	parseContent
} from '../../lib/editor/backward-compat.js';
import type { JSONContent } from '@tiptap/core';

describe('backward-compat', () => {
	describe('isTiptapDoc', () => {
		it('returns true for a valid tiptap doc', () => {
			const doc: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };
			expect(isTiptapDoc(doc)).toBe(true);
		});

		it('returns false for an array (legacy blocks)', () => {
			expect(isTiptapDoc([])).toBe(false);
		});

		it('returns false for null', () => {
			expect(isTiptapDoc(null)).toBe(false);
		});

		it('returns false for undefined', () => {
			expect(isTiptapDoc(undefined)).toBe(false);
		});

		it('returns false for a non-doc object (different type)', () => {
			expect(isTiptapDoc({ type: 'paragraph' })).toBe(false);
		});

		it('returns false for a plain string', () => {
			// strings are not valid ContentFormat but can happen
			expect(isTiptapDoc('' as unknown as null)).toBe(false);
		});
	});

	describe('isLegacyBlocks', () => {
		it('returns true for an array', () => {
			expect(isLegacyBlocks([])).toBe(true);
		});

		it('returns true for non-empty block array', () => {
			const blocks = [{ id: '1', type: 'paragraph', content: 'hello', attrs: {} }];
			expect(isLegacyBlocks(blocks as never)).toBe(true);
		});

		it('returns false for a tiptap doc', () => {
			const doc: JSONContent = { type: 'doc', content: [] };
			expect(isLegacyBlocks(doc)).toBe(false);
		});

		it('returns false for null', () => {
			expect(isLegacyBlocks(null)).toBe(false);
		});
	});

	describe('parseContent', () => {
		it('parses a tiptap JSON string', () => {
			const doc: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };
			const parsed = parseContent(JSON.stringify(doc));
			expect(isTiptapDoc(parsed)).toBe(true);
		});

		it('parses a legacy block array JSON string', () => {
			const blocks = [{ id: '1', type: 'paragraph', content: 'hello', attrs: {} }];
			const parsed = parseContent(JSON.stringify(blocks));
			expect(isLegacyBlocks(parsed)).toBe(true);
		});

		it('returns null for invalid JSON', () => {
			expect(parseContent('not-json')).toBe(null);
		});

		it('returns null for null input', () => {
			expect(parseContent(null)).toBe(null);
		});

		it('returns null for empty string', () => {
			expect(parseContent('')).toBe(null);
		});

		it('returns null for "null" string', () => {
			expect(parseContent('null')).toBe(null);
		});
	});
});
