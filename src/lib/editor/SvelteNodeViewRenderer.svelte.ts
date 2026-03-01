import { mount, unmount } from 'svelte';
import type { NodeViewRendererProps, NodeViewRenderer } from '@tiptap/core';

type SvelteComponent = Parameters<typeof mount>[0];

/**
 * Renders a Svelte 5 component as a ProseMirror node view.
 * The component receives: node, editor, getPos, decorations, innerDecorations.
 */
export function SvelteNodeViewRenderer(Component: SvelteComponent): NodeViewRenderer {
	return (props: NodeViewRendererProps) => {
		const dom = document.createElement('div');
		dom.setAttribute('data-node-view-wrapper', '');
		dom.style.whiteSpace = 'normal';

		// Use a plain object for reactive props — Svelte 5 mount accepts a plain object
		const componentProps = $state<Record<string, unknown>>({
			node: props.node,
			editor: props.editor,
			getPos: props.getPos,
			decorations: props.decorations,
			innerDecorations: props.innerDecorations,
			HTMLAttributes: props.HTMLAttributes ?? {}
		});

		let instance: ReturnType<typeof mount> | null = null;

		// Must defer mount until the DOM element is connected to avoid hydration issues
		const mountComponent = () => {
			instance = mount(Component, { target: dom, props: componentProps });
		};

		// Mount immediately (the caller appends dom to the editor view)
		mountComponent();

		return {
			dom,

			update(newNode) {
				if (newNode.type !== props.node.type) return false;
				componentProps.node = newNode;
				return true;
			},

			destroy() {
				if (instance) {
					unmount(instance);
					instance = null;
				}
			},

			// Prevent ProseMirror from handling events inside node views
			// so that inputs within the node view work correctly
			stopEvent(event: Event) {
				// Allow clipboard events to pass through to the editor
				if (event.type.startsWith('drag')) return false;
				return true;
			},

			ignoreMutation() {
				return true;
			}
		};
	};
}
