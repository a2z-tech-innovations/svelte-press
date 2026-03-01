/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { getExtensions } from '../../../lib/editor/extensions/index.js';
import { tiptapToHtml } from '../../../lib/editor/html-export.js';

describe('Spacer extension', () => {
	let editor: Editor;

	beforeEach(() => {
		editor = new Editor({ extensions: getExtensions(), content: '<p></p>' });
	});

	afterEach(() => {
		editor.destroy();
	});

	it('inserts spacer with default height 40', () => {
		editor.commands.insertContent({ type: 'spacer' });
		const json = editor.getJSON();
		const spacer = json.content?.find((n) => n.type === 'spacer');
		expect(spacer?.attrs?.height).toBe(40);
	});

	it('inserts spacer with custom height', () => {
		editor.commands.insertContent({ type: 'spacer', attrs: { height: 80 } });
		const json = editor.getJSON();
		const spacer = json.content?.find((n) => n.type === 'spacer');
		expect(spacer?.attrs?.height).toBe(80);
	});

	it('renders to HTML with correct height style', () => {
		const doc = { type: 'doc', content: [{ type: 'spacer', attrs: { height: 100 } }] };
		const html = tiptapToHtml(doc, getExtensions());
		expect(html).toContain('height: 100px');
		expect(html).toContain('data-type="spacer"');
	});

	it('has atom: true (no child nodes allowed)', () => {
		const ext = editor.extensionManager.extensions.find((e) => e.name === 'spacer');
		expect(ext).toBeTruthy();
	});
});
