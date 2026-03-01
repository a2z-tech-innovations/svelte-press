/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import { tiptapToHtml } from '../../lib/editor/html-export.js';
import { getExtensions } from '../../lib/editor/extensions/index.js';
import type { JSONContent } from '@tiptap/core';

const extensions = getExtensions();

describe('tiptapToHtml', () => {
	it('renders paragraph content', () => {
		const doc: JSONContent = {
			type: 'doc',
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }]
		};
		const html = tiptapToHtml(doc, extensions);
		expect(html).toContain('Hello world');
		expect(html).toContain('<p');
	});

	it('renders headings with correct level', () => {
		const doc: JSONContent = {
			type: 'doc',
			content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'My Title' }] }]
		};
		const html = tiptapToHtml(doc, extensions);
		expect(html).toContain('<h2');
		expect(html).toContain('My Title');
	});

	it('renders bold text with <strong> tag', () => {
		const doc: JSONContent = {
			type: 'doc',
			content: [{
				type: 'paragraph',
				content: [{ type: 'text', text: 'bold', marks: [{ type: 'bold' }] }]
			}]
		};
		const html = tiptapToHtml(doc, extensions);
		expect(html).toContain('<strong>bold</strong>');
	});

	it('contains zero Svelte comment nodes (<!---->)', () => {
		const doc: JSONContent = {
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'test' }] },
				{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'h2' }] },
				{ type: 'spacer', attrs: { height: 40 } },
				{ type: 'gallery', attrs: { images: [] } },
				{ type: 'embed', attrs: { url: '', embedHtml: '', caption: '' } },
				{ type: 'html', attrs: { rawHtml: '<div>raw</div>' } },
				{ type: 'shortcode', attrs: { code: '[sc]' } }
			]
		};
		const html = tiptapToHtml(doc, extensions);
		expect(html.includes('<!---->')).toBe(false);
		expect(html.includes('<!--')).toBe(false);
	});

	it('renders spacer with correct height style', () => {
		const doc: JSONContent = {
			type: 'doc',
			content: [{ type: 'spacer', attrs: { height: 60 } }]
		};
		const html = tiptapToHtml(doc, extensions);
		expect(html).toContain('height: 60px');
	});

	it('renders blockquote', () => {
		const doc: JSONContent = {
			type: 'doc',
			content: [{
				type: 'blockquote',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Quote text' }] }]
			}]
		};
		const html = tiptapToHtml(doc, extensions);
		expect(html).toContain('<blockquote');
		expect(html).toContain('Quote text');
	});

	it('renders bullet list', () => {
		const doc: JSONContent = {
			type: 'doc',
			content: [{
				type: 'bulletList',
				content: [{
					type: 'listItem',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item 1' }] }]
				}]
			}]
		};
		const html = tiptapToHtml(doc, extensions);
		expect(html).toContain('<ul');
		expect(html).toContain('Item 1');
	});

	it('renders columns layout', () => {
		const doc: JSONContent = {
			type: 'doc',
			content: [{
				type: 'columns',
				content: [
					{ type: 'column', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'left' }] }] },
					{ type: 'column', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'right' }] }] }
				]
			}]
		};
		const html = tiptapToHtml(doc, extensions);
		expect(html).toContain('sp-columns-wrap');
		expect(html).toContain('left');
		expect(html).toContain('right');
	});

	it('renders shortcode with code value', () => {
		const doc: JSONContent = {
			type: 'doc',
			content: [{ type: 'shortcode', attrs: { code: '[my-shortcode]' } }]
		};
		const html = tiptapToHtml(doc, extensions);
		expect(html).toContain('[my-shortcode]');
	});
});
