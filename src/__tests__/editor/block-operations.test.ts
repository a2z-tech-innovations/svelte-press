/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { getExtensions } from '../../lib/editor/extensions/index.js';

function countTopLevelNodes(editor: Editor): number {
	return editor.getJSON().content?.length ?? 0;
}

describe('block operations', () => {
	let editor: Editor;

	beforeEach(() => {
		editor = new Editor({
			extensions: getExtensions(),
			content: {
				type: 'doc',
				content: [
					{ type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
					{ type: 'paragraph', content: [{ type: 'text', text: 'Second' }] },
					{ type: 'paragraph', content: [{ type: 'text', text: 'Third' }] }
				]
			}
		});
	});

	afterEach(() => {
		editor.destroy();
	});

	it('starts with 3 top-level nodes', () => {
		expect(countTopLevelNodes(editor)).toBe(3);
	});

	it('inserts a new block increasing node count', () => {
		editor.commands.insertContent({ type: 'spacer', attrs: { height: 40 } });
		expect(countTopLevelNodes(editor)).toBe(4);
	});

	it('inserts multiple blocks', () => {
		editor.commands.insertContent({ type: 'spacer', attrs: { height: 40 } });
		editor.commands.insertContent({ type: 'gallery', attrs: { images: [] } });
		expect(countTopLevelNodes(editor)).toBe(5);
	});

	it('undo removes last inserted block', () => {
		editor.commands.insertContent({ type: 'spacer', attrs: { height: 40 } });
		expect(countTopLevelNodes(editor)).toBe(4);
		editor.commands.undo();
		expect(countTopLevelNodes(editor)).toBe(3);
	});

	it('redo re-applies undone insertion', () => {
		editor.commands.insertContent({ type: 'spacer', attrs: { height: 40 } });
		editor.commands.undo();
		editor.commands.redo();
		expect(countTopLevelNodes(editor)).toBe(4);
	});

	it('clears all content', () => {
		editor.commands.clearContent();
		// After clearContent, Tiptap keeps a single empty paragraph
		const json = editor.getJSON();
		expect(json.content?.every((n) => n.type === 'paragraph' && !n.content)).toBeTruthy();
	});

	it('can select all content', () => {
		editor.commands.selectAll();
		const { from, to } = editor.state.selection;
		expect(to).toBeGreaterThan(from);
	});

	it('bold toggle marks selected text', () => {
		editor.commands.setContent('<p>Hello</p>');
		editor.commands.selectAll();
		editor.commands.toggleBold();
		const json = editor.getJSON();
		const hasBold = json.content?.[0].content?.some((n) => n.marks?.some((m) => m.type === 'bold'));
		expect(hasBold).toBe(true);
	});

	it('toggling bold twice removes bold mark', () => {
		editor.commands.setContent('<p>Hello</p>');
		editor.commands.selectAll();
		editor.commands.toggleBold();
		editor.commands.toggleBold();
		const json = editor.getJSON();
		const hasBold = json.content?.[0].content?.some((n) => n.marks?.some((m) => m.type === 'bold'));
		expect(hasBold).toBeFalsy();
	});
});
