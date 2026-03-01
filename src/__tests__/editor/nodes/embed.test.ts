/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { getExtensions } from '../../../lib/editor/extensions/index.js';
import { tiptapToHtml } from '../../../lib/editor/html-export.js';

describe('Embed extension', () => {
	let editor: Editor;

	beforeEach(() => {
		editor = new Editor({ extensions: getExtensions(), content: '<p></p>' });
	});

	afterEach(() => {
		editor.destroy();
	});

	it('inserts embed with url and embedHtml', () => {
		editor.commands.insertContent({
			type: 'embed',
			attrs: { url: 'https://youtu.be/abc', embedHtml: '<iframe src="https://youtu.be/abc"></iframe>', caption: '' }
		});
		const json = editor.getJSON();
		const embed = json.content?.find((n) => n.type === 'embed');
		expect(embed?.attrs?.url).toBe('https://youtu.be/abc');
		expect(embed?.attrs?.embedHtml).toContain('<iframe');
	});

	it('defaults caption to empty string', () => {
		editor.commands.insertContent({ type: 'embed', attrs: { url: 'u', embedHtml: '', caption: '' } });
		const json = editor.getJSON();
		const embed = json.content?.find((n) => n.type === 'embed');
		expect(embed?.attrs?.caption).toBe('');
	});

	it('renders embed HTML with data-type="embed"', () => {
		const doc = {
			type: 'doc',
			content: [{ type: 'embed', attrs: { url: 'https://ex.com', embedHtml: '', caption: '' } }]
		};
		const html = tiptapToHtml(doc, getExtensions());
		expect(html).toContain('data-type="embed"');
	});
});
