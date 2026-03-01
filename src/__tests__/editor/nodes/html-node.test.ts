/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { getExtensions } from '../../../lib/editor/extensions/index.js';
import { tiptapToHtml } from '../../../lib/editor/html-export.js';

describe('Html extension', () => {
	let editor: Editor;

	beforeEach(() => {
		editor = new Editor({ extensions: getExtensions(), content: '<p></p>' });
	});

	afterEach(() => {
		editor.destroy();
	});

	it('inserts html block with rawHtml', () => {
		editor.commands.insertContent({ type: 'html', attrs: { rawHtml: '<div>test</div>' } });
		const json = editor.getJSON();
		const html = json.content?.find((n) => n.type === 'html');
		expect(html?.attrs?.rawHtml).toBe('<div>test</div>');
	});

	it('defaults rawHtml to empty string', () => {
		editor.commands.insertContent({ type: 'html', attrs: { rawHtml: '' } });
		const json = editor.getJSON();
		const html = json.content?.find((n) => n.type === 'html');
		expect(html?.attrs?.rawHtml).toBe('');
	});

	it('renders html block with data-type="raw-html"', () => {
		const doc = { type: 'doc', content: [{ type: 'html', attrs: { rawHtml: '<b>bold</b>' } }] };
		const renderedHtml = tiptapToHtml(doc, getExtensions());
		expect(renderedHtml).toContain('data-type="raw-html"');
	});

	it('roundtrips html block content', () => {
		const rawHtml = '<section><h2>Title</h2><p>Body</p></section>';
		editor.commands.insertContent({ type: 'html', attrs: { rawHtml } });
		const json = editor.getJSON();
		const str = JSON.stringify(json);
		const parsed = JSON.parse(str);

		const editor2 = new Editor({ extensions: getExtensions(), content: parsed });
		const json2 = editor2.getJSON();
		const htmlNode = json2.content?.find((n) => n.type === 'html');
		expect(htmlNode?.attrs?.rawHtml).toBe(rawHtml);
		editor2.destroy();
	});
});
