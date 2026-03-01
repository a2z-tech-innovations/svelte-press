/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { getExtensions } from '../../lib/editor/extensions/index.js';

describe('Tiptap serialization roundtrip', () => {
	let editor: Editor;

	beforeEach(() => {
		editor = new Editor({ extensions: getExtensions(), content: '<p></p>' });
	});

	afterEach(() => {
		editor.destroy();
	});

	it('roundtrips paragraph content', () => {
		editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }] });
		const json = editor.getJSON();
		const roundtripped = JSON.parse(JSON.stringify(json));

		const editor2 = new Editor({ extensions: getExtensions(), content: roundtripped });
		expect(editor2.getJSON()).toEqual(json);
		editor2.destroy();
	});

	it('roundtrips heading with level', () => {
		const doc = {
			type: 'doc',
			content: [{ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Title' }] }]
		};
		editor.commands.setContent(doc);
		const json = editor.getJSON();

		const editor2 = new Editor({ extensions: getExtensions(), content: json });
		const result = editor2.getJSON();
		expect(result.content?.[0].attrs?.level).toBe(3);
		editor2.destroy();
	});

	it('roundtrips spacer with custom height', () => {
		editor.commands.insertContent({ type: 'spacer', attrs: { height: 120 } });
		const json = editor.getJSON();
		const spacerNode = json.content?.find((n) => n.type === 'spacer');
		expect(spacerNode?.attrs?.height).toBe(120);

		const editor2 = new Editor({ extensions: getExtensions(), content: json });
		const json2 = editor2.getJSON();
		const spacer2 = json2.content?.find((n) => n.type === 'spacer');
		expect(spacer2?.attrs?.height).toBe(120);
		editor2.destroy();
	});

	it('roundtrips gallery with images', () => {
		const images = [
			{ src: '/a.jpg', alt: 'A', caption: 'Caption A' },
			{ src: '/b.jpg', alt: 'B', caption: '' }
		];
		editor.commands.insertContent({ type: 'gallery', attrs: { images } });
		const json = editor.getJSON();

		const editor2 = new Editor({ extensions: getExtensions(), content: json });
		const json2 = editor2.getJSON();
		const gallery = json2.content?.find((n) => n.type === 'gallery');
		const imgs = gallery?.attrs?.images as typeof images;
		expect(imgs.length).toBe(2);
		expect(imgs[0].src).toBe('/a.jpg');
		editor2.destroy();
	});

	it('roundtrips columns block', () => {
		const doc = {
			type: 'doc',
			content: [{
				type: 'columns',
				content: [
					{ type: 'column', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'left' }] }] },
					{ type: 'column', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'right' }] }] }
				]
			}]
		};
		editor.commands.setContent(doc);
		const json = editor.getJSON();

		const editor2 = new Editor({ extensions: getExtensions(), content: json });
		const result = editor2.getJSON();
		expect(result.content?.[0].type).toBe('columns');
		expect(result.content?.[0].content?.length).toBe(2);
		editor2.destroy();
	});

	it('preserves bold/italic marks in roundtrip', () => {
		const doc = {
			type: 'doc',
			content: [{
				type: 'paragraph',
				content: [
					{ type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
					{ type: 'text', text: ' normal' }
				]
			}]
		};
		editor.commands.setContent(doc);
		const json = editor.getJSON();

		const editor2 = new Editor({ extensions: getExtensions(), content: json });
		const result = editor2.getJSON();
		const boldNode = result.content?.[0].content?.find((n) => n.marks?.some((m) => m.type === 'bold'));
		expect(boldNode).toBeTruthy();
		editor2.destroy();
	});
});
