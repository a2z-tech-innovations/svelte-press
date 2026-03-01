import { Node, mergeAttributes } from '@tiptap/core';

export const Spacer = Node.create({
	name: 'spacer',
	group: 'block',
	atom: true,

	addAttributes() {
		return {
			height: { default: 40 }
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-type="spacer"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(HTMLAttributes, {
				'data-type': 'spacer',
				class: 'sp-spacer',
				style: `height: ${HTMLAttributes.height as number}px; display: block;`
			})
		];
	},

});
