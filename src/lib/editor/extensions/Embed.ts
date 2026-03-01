import { Node, mergeAttributes } from '@tiptap/core';

export const Embed = Node.create({
	name: 'embed',
	group: 'block',
	atom: true,

	addAttributes() {
		return {
			url: { default: '' },
			caption: { default: '' },
			embedHtml: { default: '' }
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-type="embed"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		const embedHtml = (HTMLAttributes.embedHtml as string) ?? '';
		const url = (HTMLAttributes.url as string) ?? '';
		const caption = (HTMLAttributes.caption as string) ?? '';

		const inner = embedHtml
			? embedHtml
			: url
				? `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
				: '';

		return [
			'figure',
			mergeAttributes(HTMLAttributes, { 'data-type': 'embed', class: 'sp-embed-block' }),
			['div', { class: 'sp-embed-content', innerHTML: inner }],
			...(caption ? [['figcaption', {}, caption]] : [])
		];
	},

});
