import { Node, mergeAttributes } from '@tiptap/core';

export const Pullquote = Node.create({
	name: 'pullquote',
	group: 'block',
	content: 'inline*',

	addAttributes() {
		return {
			citation: { default: '' }
		};
	},

	parseHTML() {
		return [{ tag: 'blockquote[data-type="pullquote"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'blockquote',
			mergeAttributes(HTMLAttributes, { 'data-type': 'pullquote', class: 'sp-pullquote' }),
			['p', 0],
			...(HTMLAttributes.citation
				? [['cite', {}, HTMLAttributes.citation as string]]
				: [])
		];
	}
});
