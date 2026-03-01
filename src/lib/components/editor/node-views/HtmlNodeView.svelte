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

	let rawHtml = $derived((node.attrs.rawHtml as string) ?? '');
	let htmlInput = $state(rawHtml);
	let preview = $state(false);

	$effect(() => { htmlInput = rawHtml; });

	function save() {
		const pos = getPos();
		if (pos === undefined) return;
		editor.view.dispatch(
			editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, rawHtml: htmlInput })
		);
	}
</script>

<div class="sp-html-nv" contenteditable="false">
	<div class="sp-html-header">
		<span style="font-size:12px;font-weight:600;color:var(--sp-text-muted,#646970);">Custom HTML</span>
		<button type="button" class="sp-btn sp-btn-sm sp-btn-secondary" onclick={() => (preview = !preview)}>
			{preview ? 'Edit' : 'Preview'}
		</button>
	</div>

	{#if preview}
		<div class="sp-html-preview">
			{@html htmlInput}
		</div>
	{:else}
		<textarea
			class="sp-textarea sp-html-textarea"
			placeholder="<p>Enter raw HTML…</p>"
			bind:value={htmlInput}
			onblur={save}
			spellcheck={false}
		></textarea>
	{/if}
</div>
<BlockControls {editor} {getPos} {node} />

<style>
	.sp-html-nv {
		border: 2px solid var(--sp-border, #c3c4c7);
		border-radius: 4px;
	}

	.sp-html-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 10px;
		background: #f6f7f7;
		border-bottom: 1px solid var(--sp-border, #c3c4c7);
	}

	.sp-html-textarea {
		display: block;
		width: 100%;
		min-height: 120px;
		font-family: 'Fira Code', 'Cascadia Code', Consolas, monospace;
		font-size: 12px;
		border: none;
		border-radius: 0;
		resize: vertical;
		padding: 10px;
	}

	.sp-html-preview {
		padding: 12px;
		min-height: 60px;
	}
</style>
