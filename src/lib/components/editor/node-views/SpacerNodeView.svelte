<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import type { Node } from '@tiptap/pm/model';
	import BlockControls from './BlockControls.svelte';

	let {
		node,
		editor,
		getPos
	}: {
		node: Node;
		editor: Editor;
		getPos: () => number | undefined;
	} = $props();

	let height = $derived((node.attrs.height as number) ?? 40);

	function updateHeight(newHeight: number) {
		const pos = getPos();
		if (pos === undefined) return;
		editor.view.dispatch(
			editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, height: newHeight })
		);
	}
</script>

<div class="sp-spacer-nv" style="height: {height}px;" contenteditable="false">
	<div class="sp-spacer-inner">
		<span class="sp-spacer-label">Spacer — {height}px</span>
		<input
			type="range"
			min="10"
			max="200"
			step="10"
			value={height}
			oninput={(e) => updateHeight(Number((e.target as HTMLInputElement).value))}
			class="sp-spacer-range"
		/>
	</div>
</div>
<BlockControls {editor} {getPos} {node} />

<style>
	.sp-spacer-nv {
		position: relative;
		background: repeating-linear-gradient(
			45deg,
			transparent,
			transparent 8px,
			rgba(0,0,0,0.04) 8px,
			rgba(0,0,0,0.04) 16px
		);
		border: 2px dashed var(--sp-border, #c3c4c7);
		border-radius: 4px;
		min-height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.sp-spacer-inner {
		display: flex;
		align-items: center;
		gap: 8px;
		background: rgba(255,255,255,0.9);
		padding: 4px 12px;
		border-radius: 3px;
	}

	.sp-spacer-label {
		font-size: 11px;
		color: var(--sp-text-muted, #646970);
		white-space: nowrap;
	}

	.sp-spacer-range {
		width: 100px;
		cursor: ew-resize;
	}
</style>
