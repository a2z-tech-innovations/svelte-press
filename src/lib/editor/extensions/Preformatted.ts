import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Preformatted text block (maps to <pre> without syntax highlighting).
 * Distinct from CodeBlock which uses lowlight.
 */
export const Preformatted = Node.create({
	name: 'preformatted',
	group: 'block',
	content: 'text*',
	marks: '',
	code: true,
	defining: true,
	whitespace: 'pre',

	parseHTML() {
		return [{ tag: 'pre[data-type="preformatted"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'pre',
			mergeAttributes(HTMLAttributes, { 'data-type': 'preformatted', class: 'sp-preformatted' }),
			['code', {}, 0]
		];
	}
});
