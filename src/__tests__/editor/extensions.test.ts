/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { getExtensions } from '../../lib/editor/extensions/index.js';

function createEditor() {
	const editor = new Editor({
		extensions: getExtensions(),
		content: '<p></p>'
	});
	return editor;
}

describe('Tiptap extensions', () => {
	let editor: Editor;

	beforeEach(() => {
		editor = createEditor();
	});

	afterEach(() => {
		editor.destroy();
	});

	it('creates an editor with all extensions without errors', () => {
		expect(editor).toBeTruthy();
		expect(editor.isDestroyed).toBe(false);
	});

	it('serializes paragraph to JSON correctly', () => {
		editor.commands.setContent('<p>Hello world</p>');
		const json = editor.getJSON();
		expect(json.type).toBe('doc');
		expect(json.content?.[0].type).toBe('paragraph');
	});

	it('serializes heading to JSON correctly', () => {
		editor.commands.setContent('<h2>My heading</h2>');
		const json = editor.getJSON();
		expect(json.content?.[0].type).toBe('heading');
		expect(json.content?.[0].attrs?.level).toBe(2);
	});

	it('inserts and serializes spacer block', () => {
		editor.commands.insertContent({ type: 'spacer', attrs: { height: 80 } });
		const json = editor.getJSON();
		const spacer = json.content?.find((n) => n.type === 'spacer');
		expect(spacer).toBeTruthy();
		expect(spacer?.attrs?.height).toBe(80);
	});

	it('inserts and serializes gallery block', () => {
		const images = [{ src: '/img.jpg', alt: 'test', caption: '' }];
		editor.commands.insertContent({ type: 'gallery', attrs: { images } });
		const json = editor.getJSON();
		const gallery = json.content?.find((n) => n.type === 'gallery');
		expect(gallery).toBeTruthy();
		expect(Array.isArray(gallery?.attrs?.images)).toBe(true);
		expect((gallery?.attrs?.images as typeof images)[0].src).toBe('/img.jpg');
	});

	it('inserts and serializes video block', () => {
		editor.commands.insertContent({ type: 'video', attrs: { url: 'https://example.com/v.mp4', caption: 'cap' } });
		const json = editor.getJSON();
		const video = json.content?.find((n) => n.type === 'video');
		expect(video).toBeTruthy();
		expect(video?.attrs?.url).toBe('https://example.com/v.mp4');
		expect(video?.attrs?.caption).toBe('cap');
	});

	it('inserts and serializes embed block', () => {
		editor.commands.insertContent({ type: 'embed', attrs: { url: 'https://youtube.com/watch?v=1', embedHtml: '<iframe></iframe>', caption: '' } });
		const json = editor.getJSON();
		const embed = json.content?.find((n) => n.type === 'embed');
		expect(embed).toBeTruthy();
		expect(embed?.attrs?.url).toBe('https://youtube.com/watch?v=1');
		expect(embed?.attrs?.embedHtml).toBe('<iframe></iframe>');
	});

	it('inserts and serializes html block', () => {
		editor.commands.insertContent({ type: 'html', attrs: { rawHtml: '<div>custom</div>' } });
		const json = editor.getJSON();
		const html = json.content?.find((n) => n.type === 'html');
		expect(html).toBeTruthy();
		expect(html?.attrs?.rawHtml).toBe('<div>custom</div>');
	});

	it('inserts and serializes shortcode block', () => {
		editor.commands.insertContent({ type: 'shortcode', attrs: { code: '[gallery id="1"]' } });
		const json = editor.getJSON();
		const sc = json.content?.find((n) => n.type === 'shortcode');
		expect(sc).toBeTruthy();
		expect(sc?.attrs?.code).toBe('[gallery id="1"]');
	});

	it('inserts and serializes button block', () => {
		editor.commands.insertContent({
			type: 'button',
			attrs: { url: 'https://example.com', target: '_blank', style: 'outline' },
			content: [{ type: 'text', text: 'Click' }]
		});
		const json = editor.getJSON();
		const btn = json.content?.find((n) => n.type === 'button');
		expect(btn).toBeTruthy();
		expect(btn?.attrs?.url).toBe('https://example.com');
		expect(btn?.attrs?.target).toBe('_blank');
		expect(btn?.attrs?.style).toBe('outline');
	});

	it('inserts and serializes preformatted block', () => {
		editor.commands.insertContent({
			type: 'preformatted',
			content: [{ type: 'text', text: 'some code' }]
		});
		const json = editor.getJSON();
		const pre = json.content?.find((n) => n.type === 'preformatted');
		expect(pre).toBeTruthy();
	});

	it('inserts and serializes columns with two column children', () => {
		editor.commands.insertContent({
			type: 'columns',
			content: [
				{ type: 'column', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'left' }] }] },
				{ type: 'column', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'right' }] }] }
			]
		});
		const json = editor.getJSON();
		const columns = json.content?.find((n) => n.type === 'columns');
		expect(columns).toBeTruthy();
		expect(columns?.content?.length).toBe(2);
		expect(columns?.content?.[0].type).toBe('column');
		expect(columns?.content?.[1].type).toBe('column');
	});

	it('toggles bold mark correctly', () => {
		editor.commands.setContent('<p>Hello</p>');
		editor.commands.selectAll();
		editor.commands.setBold();
		const json = editor.getJSON();
		const marks = json.content?.[0].content?.[0].marks;
		expect(marks?.some((m) => m.type === 'bold')).toBe(true);
	});

	it('inserts bullet list', () => {
		editor.commands.toggleBulletList();
		const json = editor.getJSON();
		expect(json.content?.[0].type).toBe('bulletList');
	});

	it('inserts table with rows', () => {
		editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
		const json = editor.getJSON();
		const table = json.content?.find((n) => n.type === 'table');
		expect(table).toBeTruthy();
	});
});
