import { Node, mergeAttributes } from '@tiptap/core';

export const Shortcode = Node.create({
	name: 'shortcode',
	group: 'block',
	atom: true,

	addAttributes() {
		return {
			code: { default: '' }
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-type="shortcode"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		const code = (HTMLAttributes.code as string) ?? '';
		return [
			'div',
			mergeAttributes(HTMLAttributes, {
				'data-type': 'shortcode',
				class: 'sp-shortcode-block'
			}),
			['code', {}, code]
		];
	},

});
