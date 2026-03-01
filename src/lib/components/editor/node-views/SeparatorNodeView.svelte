<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import type { Node } from '@tiptap/pm/model';

	let {
		node,
		editor,
		getPos
	}: {
		node: Node;
		editor: Editor;
		getPos: () => number | undefined;
	} = $props();

	let style = $derived((node.attrs.style as string) ?? 'default');

	function updateStyle(newStyle: string) {
		const pos = getPos();
		if (pos === undefined) return;
		editor.view.dispatch(
			editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, style: newStyle })
		);
	}
</script>

<div class="sp-separator-nv" contenteditable="false">
	<div class="sp-separator-preview sp-separator-{style}"></div>
	<div class="sp-separator-controls">
		<select
			value={style}
			onchange={(e) => updateStyle((e.target as HTMLSelectElement).value)}
			class="sp-select"
			style="font-size:12px;padding:2px 6px;height:auto;"
		>
			<option value="default">Default</option>
			<option value="wide">Wide</option>
			<option value="dots">Dots</option>
		</select>
	</div>
</div>

<style>
	.sp-separator-nv {
		padding: 8px 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
		align-items: center;
	}

	.sp-separator-preview {
		width: 100%;
		border-top: 1px solid var(--sp-border, #c3c4c7);
	}

	.sp-separator-wide {
		border-top-width: 3px;
	}

	.sp-separator-dots {
		border: none;
		text-align: center;
	}

	.sp-separator-dots::after {
		content: '· · ·';
		letter-spacing: 0.5em;
		color: var(--sp-text-muted, #646970);
	}

	.sp-separator-controls {
		display: flex;
		align-items: center;
		gap: 8px;
	}
</style>
