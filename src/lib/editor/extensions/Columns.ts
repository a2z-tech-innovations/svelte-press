import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Two-column layout block.
 * Content model: two Column child nodes.
 * No recursive columns allowed.
 */
export const Column = Node.create({
	name: 'column',
	group: 'column',
	content: 'block+',
	isolating: true,

	parseHTML() {
		return [{ tag: 'div[data-type="column"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column', class: 'sp-column' }), 0];
	}
});

export const Columns = Node.create({
	name: 'columns',
	group: 'block',
	content: 'column column',

	parseHTML() {
		return [{ tag: 'div[data-type="columns"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(HTMLAttributes, {
				'data-type': 'columns',
				class: 'sp-columns-wrap',
				style: 'display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;'
			}),
			0
		];
	}
});
