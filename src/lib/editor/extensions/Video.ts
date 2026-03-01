import { Node, mergeAttributes } from '@tiptap/core';

export const Video = Node.create({
	name: 'video',
	group: 'block',
	atom: true,

	addAttributes() {
		return {
			url: { default: '' },
			caption: { default: '' }
		};
	},

	parseHTML() {
		return [{ tag: 'figure[data-type="video"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		const url = (HTMLAttributes.url as string) ?? '';
		const caption = (HTMLAttributes.caption as string) ?? '';
		return [
			'figure',
			mergeAttributes(HTMLAttributes, { 'data-type': 'video', class: 'sp-video-block' }),
			['video', { src: url, controls: '', style: 'width:100%;max-width:100%;' }],
			...(caption ? [['figcaption', {}, caption]] : [])
		];
	},

});
