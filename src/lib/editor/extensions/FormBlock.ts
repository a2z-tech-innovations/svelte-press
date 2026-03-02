import { Node, mergeAttributes } from '@tiptap/core';

export const FormBlock = Node.create({
	name: 'form',
	group: 'block',
	atom: true,

	addAttributes() {
		return {
			nodeId: { default: '' },
			title: { default: 'Contact Form' },
			fields: { default: [] },
			settings: {
				default: {
					submitLabel: 'Send',
					successMessage: 'Thank you for your submission!',
					emailNotification: false
				}
			}
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-type="form"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		const nodeId = (HTMLAttributes.nodeId as string) ?? '';
		const title = (HTMLAttributes.title as string) ?? 'Form';
		return [
			'div',
			mergeAttributes(HTMLAttributes, {
				'data-type': 'form',
				'data-node-id': nodeId,
				class: 'sp-form-block-placeholder'
			}),
			['span', {}, `Form: ${title}`]
		];
	}
});
