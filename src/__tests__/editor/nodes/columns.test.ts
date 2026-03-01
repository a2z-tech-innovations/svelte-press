/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { getExtensions } from '../../../lib/editor/extensions/index.js';
import { tiptapToHtml } from '../../../lib/editor/html-export.js';

const columnsDoc = {
	type: 'doc',
	content: [{
		type: 'columns',
		content: [
			{ type: 'column', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Left side' }] }] },
			{ type: 'column', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Right side' }] }] }
		]
	}]
};

describe('Columns extension', () => {
	let editor: Editor;

	beforeEach(() => {
		editor = new Editor({ extensions: getExtensions(), content: '<p></p>' });
	});

	afterEach(() => {
		editor.destroy();
	});

	it('inserts columns block with two column children', () => {
		editor.commands.setContent(columnsDoc);
		const json = editor.getJSON();
		const cols = json.content?.find((n) => n.type === 'columns');
		expect(cols).toBeTruthy();
		expect(cols?.content?.length).toBe(2);
		expect(cols?.content?.every((c) => c.type === 'column')).toBe(true);
	});

	it('preserves content in each column', () => {
		editor.commands.setContent(columnsDoc);
		const json = editor.getJSON();
		// Use generateHTML to verify content instead of deeply traversing JSON types
		const { generateHTML } = require('@tiptap/core');
		const html = generateHTML(json, getExtensions()) as string;
		expect(html).toContain('Left side');
		expect(html).toContain('Right side');
	});

	it('renders columns HTML with sp-columns-wrap class', () => {
		const html = tiptapToHtml(columnsDoc, getExtensions());
		expect(html).toContain('sp-columns-wrap');
	});

	it('renders both column contents in HTML', () => {
		const html = tiptapToHtml(columnsDoc, getExtensions());
		expect(html).toContain('Left side');
		expect(html).toContain('Right side');
	});

	it('roundtrips columns through JSON serialization', () => {
		editor.commands.setContent(columnsDoc);
		const json = editor.getJSON();
		const str = JSON.stringify(json);
		const parsed = JSON.parse(str);

		const editor2 = new Editor({ extensions: getExtensions(), content: parsed });
		const result = editor2.getJSON();
		expect(result.content?.[0].type).toBe('columns');
		expect(result.content?.[0].content?.length).toBe(2);
		editor2.destroy();
	});
});
