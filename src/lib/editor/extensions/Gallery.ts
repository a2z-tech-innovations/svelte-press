import { Node, mergeAttributes } from '@tiptap/core';

export interface GalleryImage {
	src: string;
	alt?: string;
	caption?: string;
}

export const Gallery = Node.create({
	name: 'gallery',
	group: 'block',
	atom: true,

	addAttributes() {
		return {
			images: {
				default: [] as GalleryImage[],
				parseHTML(element) {
					const raw = element.getAttribute('data-images');
					if (!raw) return [];
					try {
						return JSON.parse(raw) as GalleryImage[];
					} catch {
						return [];
					}
				},
				renderHTML(attrs) {
					return { 'data-images': JSON.stringify(attrs.images) };
				}
			}
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-type="gallery"]' }];
	},

	renderHTML({ HTMLAttributes, node }) {
		const images: GalleryImage[] = (node.attrs.images as GalleryImage[]) ?? [];
		const thumbs = images
			.map(
				(img, idx) =>
					`<figure><img src="${img.src}" alt="${img.alt ?? ''}" loading="lazy" />${img.caption ? `<figcaption>${img.caption}</figcaption>` : ''}</figure>`
			)
			.join('');

		return [
			'div',
			mergeAttributes(HTMLAttributes, {
				'data-type': 'gallery',
				class: 'sp-gallery-grid',
				'data-images': JSON.stringify(images)
			}),
			['div', { class: 'sp-gallery-inner', innerHTML: thumbs }]
		];
	},

});
