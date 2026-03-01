import { Node, mergeAttributes } from '@tiptap/core';

export const Button = Node.create({
	name: 'button',
	group: 'block',
	content: 'inline*',
	atom: false,

	addAttributes() {
		return {
			url: { default: '' },
			target: { default: '_self' },
			style: { default: 'fill' }
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-type="button-block"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		const url = (HTMLAttributes.url as string) ?? '#';
		const target = (HTMLAttributes.target as string) ?? '_self';
		const btnStyle = (HTMLAttributes.style as string) ?? 'fill';
		return [
			'div',
			mergeAttributes(HTMLAttributes, { 'data-type': 'button-block', class: 'sp-button-block', style: 'text-align:center;' }),
			[
				'a',
				{
					href: url,
					target,
					rel: target === '_blank' ? 'noopener noreferrer' : undefined,
					class: `sp-btn sp-btn-primary${btnStyle === 'outline' ? ' sp-btn-outline' : ''}`
				},
				0
			]
		];
	},

});
