import { Node, mergeAttributes } from '@tiptap/core';

export const Html = Node.create({
	name: 'html',
	group: 'block',
	atom: true,

	addAttributes() {
		return {
			rawHtml: {
				default: '',
				parseHTML(element) {
					return element.getAttribute('data-raw-html') ?? '';
				},
				renderHTML(attrs) {
					return { 'data-raw-html': attrs.rawHtml as string };
				}
			}
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-type="raw-html"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		const rawHtml = (HTMLAttributes.rawHtml as string) ?? '';
		return [
			'div',
			mergeAttributes(HTMLAttributes, {
				'data-type': 'raw-html',
				class: 'sp-html-block',
				innerHTML: rawHtml
			})
		];
	},

});
