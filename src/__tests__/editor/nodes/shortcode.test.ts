/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { getExtensions } from '../../../lib/editor/extensions/index.js';
import { tiptapToHtml } from '../../../lib/editor/html-export.js';

describe('Shortcode extension', () => {
	let editor: Editor;

	beforeEach(() => {
		editor = new Editor({ extensions: getExtensions(), content: '<p></p>' });
	});

	afterEach(() => {
		editor.destroy();
	});

	it('inserts shortcode block', () => {
		editor.commands.insertContent({ type: 'shortcode', attrs: { code: '[gallery]' } });
		const json = editor.getJSON();
		const sc = json.content?.find((n) => n.type === 'shortcode');
		expect(sc?.attrs?.code).toBe('[gallery]');
	});

	it('defaults code to empty string', () => {
		editor.commands.insertContent({ type: 'shortcode', attrs: { code: '' } });
		const json = editor.getJSON();
		const sc = json.content?.find((n) => n.type === 'shortcode');
		expect(sc?.attrs?.code).toBe('');
	});

	it('renders shortcode with code value in HTML', () => {
		const doc = { type: 'doc', content: [{ type: 'shortcode', attrs: { code: '[my-sc id="1"]' } }] };
		const html = tiptapToHtml(doc, getExtensions());
		expect(html).toContain('[my-sc id="1"]');
		expect(html).toContain('data-type="shortcode"');
	});
});
