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

	let code = $derived((node.attrs.code as string) ?? '');
	let codeInput = $state(code);

	function save() {
		const pos = getPos();
		if (pos === undefined) return;
		editor.view.dispatch(
			editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, code: codeInput })
		);
	}
</script>

<div class="sp-shortcode-nv" contenteditable="false">
	<div class="sp-shortcode-header">
		<span style="font-size:12px;font-weight:600;color:var(--sp-text-muted,#646970);">Shortcode</span>
	</div>
	<input
		type="text"
		class="sp-input sp-shortcode-input"
		placeholder="[shortcode attr=&quot;value&quot;]"
		bind:value={codeInput}
		onblur={save}
		style="font-family:monospace;font-size:13px;width:100%;"
	/>
</div>

<style>
	.sp-shortcode-nv {
		border: 2px solid var(--sp-border, #c3c4c7);
		border-radius: 4px;
		overflow: hidden;
	}

	.sp-shortcode-header {
		padding: 4px 10px;
		background: #f6f7f7;
		border-bottom: 1px solid var(--sp-border, #c3c4c7);
	}

	.sp-shortcode-input {
		border: none;
		border-radius: 0;
		background: #f9f9f9;
	}
</style>
