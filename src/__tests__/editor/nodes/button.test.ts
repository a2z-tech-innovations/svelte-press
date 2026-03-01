/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { getExtensions } from '../../../lib/editor/extensions/index.js';
import { tiptapToHtml } from '../../../lib/editor/html-export.js';

describe('Button extension', () => {
	let editor: Editor;

	beforeEach(() => {
		editor = new Editor({ extensions: getExtensions(), content: '<p></p>' });
	});

	afterEach(() => {
		editor.destroy();
	});

	it('inserts button with url, target, style', () => {
		editor.commands.insertContent({
			type: 'button',
			attrs: { url: 'https://example.com', target: '_blank', style: 'outline' },
			content: [{ type: 'text', text: 'Go' }]
		});
		const json = editor.getJSON();
		const btn = json.content?.find((n) => n.type === 'button');
		expect(btn?.attrs?.url).toBe('https://example.com');
		expect(btn?.attrs?.target).toBe('_blank');
		expect(btn?.attrs?.style).toBe('outline');
	});

	it('defaults target to _self and style to fill', () => {
		editor.commands.insertContent({ type: 'button', attrs: { url: '' } });
		const json = editor.getJSON();
		const btn = json.content?.find((n) => n.type === 'button');
		expect(btn?.attrs?.target).toBe('_self');
		expect(btn?.attrs?.style).toBe('fill');
	});

	it('renders button HTML with sp-btn class', () => {
		const doc = {
			type: 'doc',
			content: [{
				type: 'button',
				attrs: { url: 'https://ex.com', target: '_self', style: 'fill' },
				content: [{ type: 'text', text: 'Click' }]
			}]
		};
		const html = tiptapToHtml(doc, getExtensions());
		expect(html).toContain('data-type="button-block"');
		expect(html).toContain('sp-btn');
	});

	it('renders link with correct href', () => {
		const doc = {
			type: 'doc',
			content: [{
				type: 'button',
				attrs: { url: 'https://mysite.com', target: '_self', style: 'fill' },
				content: [{ type: 'text', text: 'Click' }]
			}]
		};
		const html = tiptapToHtml(doc, getExtensions());
		expect(html).toContain('href="https://mysite.com"');
	});
});
