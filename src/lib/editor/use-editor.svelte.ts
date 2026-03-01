import { Editor, type EditorOptions } from '@tiptap/core';

/**
 * Svelte 5 reactive hook wrapping a Tiptap Editor instance.
 * Re-assigns `editor` state on every ProseMirror transaction so
 * derived values in components re-compute automatically.
 */
export function useEditor(getOptions: () => Partial<EditorOptions>) {
	let editor = $state<Editor | null>(null);

	$effect(() => {
		const e = new Editor(getOptions());
		editor = e;

		// Trigger reactivity on every transaction (content/selection changes)
		e.on('transaction', () => {
			editor = e;
		});

		return () => {
			e.destroy();
			editor = null;
		};
	});

	return {
		get editor() {
			return editor;
		}
	};
}
