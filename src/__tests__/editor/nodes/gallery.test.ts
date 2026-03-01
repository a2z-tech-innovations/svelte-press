/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { getExtensions } from '../../../lib/editor/extensions/index.js';
import { tiptapToHtml } from '../../../lib/editor/html-export.js';

describe('Gallery extension', () => {
	let editor: Editor;

	beforeEach(() => {
		editor = new Editor({ extensions: getExtensions(), content: '<p></p>' });
	});

	afterEach(() => {
		editor.destroy();
	});

	it('inserts gallery with empty images array', () => {
		editor.commands.insertContent({ type: 'gallery', attrs: { images: [] } });
		const json = editor.getJSON();
		const gallery = json.content?.find((n) => n.type === 'gallery');
		expect(gallery).toBeTruthy();
		expect(gallery?.attrs?.images).toEqual([]);
	});

	it('inserts gallery with multiple images', () => {
		const images = [
			{ src: '/a.jpg', alt: 'A', caption: '' },
			{ src: '/b.jpg', alt: 'B', caption: 'caption' }
		];
		editor.commands.insertContent({ type: 'gallery', attrs: { images } });
		const json = editor.getJSON();
		const gallery = json.content?.find((n) => n.type === 'gallery');
		const imgs = gallery?.attrs?.images as typeof images;
		expect(imgs.length).toBe(2);
		expect(imgs[1].caption).toBe('caption');
	});

	it('serializes gallery images to JSON and back', () => {
		const images = [{ src: '/test.jpg', alt: 'test', caption: '' }];
		editor.commands.insertContent({ type: 'gallery', attrs: { images } });
		const json = editor.getJSON();
		const str = JSON.stringify(json);
		const parsed = JSON.parse(str);

		const editor2 = new Editor({ extensions: getExtensions(), content: parsed });
		const json2 = editor2.getJSON();
		const gallery = json2.content?.find((n) => n.type === 'gallery');
		const imgs = gallery?.attrs?.images as typeof images;
		expect(imgs[0].src).toBe('/test.jpg');
		editor2.destroy();
	});

	it('renders gallery HTML with data-type attribute', () => {
		const doc = { type: 'doc', content: [{ type: 'gallery', attrs: { images: [] } }] };
		const html = tiptapToHtml(doc, getExtensions());
		expect(html).toContain('data-type="gallery"');
	});
});
