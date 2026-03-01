/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { getExtensions } from '../../../lib/editor/extensions/index.js';
import { tiptapToHtml } from '../../../lib/editor/html-export.js';

describe('Pullquote extension', () => {
	let editor: Editor;

	beforeEach(() => {
		editor = new Editor({ extensions: getExtensions(), content: '<p></p>' });
	});

	afterEach(() => {
		editor.destroy();
	});

	it('inserts pullquote block', () => {
		editor.commands.insertContent({
			type: 'pullquote',
			attrs: { citation: 'Author Name' },
			content: [{ type: 'text', text: 'Great quote' }]
		});
		const json = editor.getJSON();
		const pq = json.content?.find((n) => n.type === 'pullquote');
		expect(pq).toBeTruthy();
		expect(pq?.attrs?.citation).toBe('Author Name');
	});

	it('defaults citation to empty string', () => {
		editor.commands.insertContent({ type: 'pullquote' });
		const json = editor.getJSON();
		const pq = json.content?.find((n) => n.type === 'pullquote');
		expect(pq?.attrs?.citation).toBe('');
	});

	it('renders pullquote as blockquote with sp-pullquote class', () => {
		const doc = {
			type: 'doc',
			content: [{
				type: 'pullquote',
				attrs: { citation: 'Auth' },
				content: [{ type: 'text', text: 'Words' }]
			}]
		};
		const html = tiptapToHtml(doc, getExtensions());
		expect(html).toContain('<blockquote');
		expect(html).toContain('sp-pullquote');
	});

	it('renders with data-type="pullquote"', () => {
		const doc = {
			type: 'doc',
			content: [{ type: 'pullquote', attrs: { citation: '' } }]
		};
		const html = tiptapToHtml(doc, getExtensions());
		expect(html).toContain('data-type="pullquote"');
	});
});
