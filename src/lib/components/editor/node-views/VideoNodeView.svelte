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

	let url = $derived((node.attrs.url as string) ?? '');
	let caption = $derived((node.attrs.caption as string) ?? '');

	let urlInput = $state(url);
	let captionInput = $state(caption);

	$effect(() => { urlInput = url; });
	$effect(() => { captionInput = caption; });

	function save() {
		const pos = getPos();
		if (pos === undefined) return;
		editor.view.dispatch(
			editor.state.tr.setNodeMarkup(pos, undefined, {
				...node.attrs,
				url: urlInput,
				caption: captionInput
			})
		);
	}
</script>

<div class="sp-video-nv" contenteditable="false">
	{#if url}
		<div class="sp-video-preview">
			<video src={url} controls style="width:100%;max-width:100%;border-radius:4px;"></video>
		</div>
	{:else}
		<div class="sp-video-placeholder">
			<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
			<span>Video Block</span>
		</div>
	{/if}
	<div class="sp-video-fields">
		<input
			type="url"
			class="sp-input"
			placeholder="Video URL (mp4, webm, etc.)"
			bind:value={urlInput}
			onblur={save}
			style="width:100%;"
		/>
		<input
			type="text"
			class="sp-input"
			placeholder="Caption (optional)"
			bind:value={captionInput}
			onblur={save}
			style="width:100%;margin-top:6px;"
		/>
	</div>
</div>
<BlockControls {editor} {getPos} {node} />

<style>
	.sp-video-nv {
		border: 2px dashed var(--sp-border, #c3c4c7);
		border-radius: 4px;
		padding: 12px;
	}

	.sp-video-placeholder {
		min-height: 80px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		color: var(--sp-text-muted, #646970);
		font-size: 13px;
		margin-bottom: 12px;
	}

	.sp-video-preview {
		margin-bottom: 12px;
	}

	.sp-video-fields {
		margin-top: 8px;
	}
</style>
