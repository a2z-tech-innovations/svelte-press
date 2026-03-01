<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import type { Node } from '@tiptap/pm/model';
	import MediaPickerDialog from '../MediaPickerDialog.svelte';

	let {
		node,
		editor,
		getPos
	}: {
		node: Node;
		editor: Editor;
		getPos: () => number | undefined;
	} = $props();

	let src = $derived((node.attrs.src as string) ?? '');
	let alt = $derived((node.attrs.alt as string) ?? '');

	let pickerOpen = $state(false);
	let altInput = $state(alt);

	function updateAttrs(attrs: Record<string, string>) {
		const pos = getPos();
		if (pos === undefined) return;
		editor.view.dispatch(
			editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs })
		);
	}

	function onImageSelected(url: string, selectedAlt: string) {
		altInput = selectedAlt;
		updateAttrs({ src: url, alt: selectedAlt });
	}
</script>

<div class="sp-image-nv" contenteditable="false">
	{#if src}
		<figure class="sp-image-figure">
			<img {src} {alt} style="max-width:100%;border-radius:4px;" />
			<div class="sp-image-actions">
				<button type="button" class="sp-btn sp-btn-secondary sp-btn-sm" onclick={() => (pickerOpen = true)}>
					Replace
				</button>
			</div>
		</figure>
		<input
			type="text"
			class="sp-input"
			placeholder="Alt text"
			bind:value={altInput}
			onblur={() => updateAttrs({ src, alt: altInput })}
			style="width:100%;margin-top:8px;font-size:12px;"
		/>
	{:else}
		<div class="sp-image-placeholder">
			<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
			<span>Image Block</span>
			<button type="button" class="sp-btn sp-btn-primary sp-btn-sm" onclick={() => (pickerOpen = true)}>
				Select Image
			</button>
		</div>
	{/if}
</div>

<MediaPickerDialog bind:open={pickerOpen} onselect={onImageSelected} />

<style>
	.sp-image-nv {
		border: 2px dashed var(--sp-border, #c3c4c7);
		border-radius: 4px;
		padding: 8px;
	}

	.sp-image-figure {
		position: relative;
		margin: 0;
	}

	.sp-image-figure img {
		display: block;
	}

	.sp-image-actions {
		position: absolute;
		top: 8px;
		right: 8px;
		opacity: 0;
		transition: opacity 0.15s;
	}

	.sp-image-nv:hover .sp-image-actions {
		opacity: 1;
	}

	.sp-image-placeholder {
		min-height: 120px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		color: var(--sp-text-muted, #646970);
		font-size: 13px;
	}
</style>
