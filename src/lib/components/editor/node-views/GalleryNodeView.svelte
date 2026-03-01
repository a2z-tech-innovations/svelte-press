<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import type { Node } from '@tiptap/pm/model';
	import MediaPickerDialog from '../MediaPickerDialog.svelte';

	interface GalleryImage {
		src: string;
		alt?: string;
		caption?: string;
	}

	let {
		node,
		editor,
		getPos
	}: {
		node: Node;
		editor: Editor;
		getPos: () => number | undefined;
	} = $props();

	let images = $derived((node.attrs.images as GalleryImage[]) ?? []);
	let pickerOpen = $state(false);

	function updateImages(newImages: GalleryImage[]) {
		const pos = getPos();
		if (pos === undefined) return;
		editor.view.dispatch(
			editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, images: newImages })
		);
	}

	function addImage(src: string, alt: string) {
		updateImages([...images, { src, alt, caption: '' }]);
	}

	function removeImage(index: number) {
		updateImages(images.filter((_, i) => i !== index));
	}
</script>

<div class="sp-gallery-nv" contenteditable="false">
	{#if images.length > 0}
		<div class="sp-gallery-grid-edit">
			{#each images as img, i}
				<div class="sp-gallery-item">
					<img src={img.src} alt={img.alt ?? ''} />
					<button
						type="button"
						class="sp-gallery-remove"
						title="Remove"
						onclick={() => removeImage(i)}
					>×</button>
				</div>
			{/each}
			<button
				type="button"
				class="sp-gallery-add-btn"
				onclick={() => (pickerOpen = true)}
				title="Add image"
			>
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="3" x2="10" y2="17"/><line x1="3" y1="10" x2="17" y2="10"/></svg>
			</button>
		</div>
	{:else}
		<div class="sp-gallery-placeholder">
			<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
			<span>Gallery Block</span>
			<button type="button" class="sp-btn sp-btn-primary sp-btn-sm" onclick={() => (pickerOpen = true)}>
				Add Images
			</button>
		</div>
	{/if}
</div>

<MediaPickerDialog bind:open={pickerOpen} onselect={addImage} />

<style>
	.sp-gallery-nv {
		border: 2px dashed var(--sp-border, #c3c4c7);
		border-radius: 4px;
		padding: 12px;
	}

	.sp-gallery-grid-edit {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 8px;
	}

	.sp-gallery-item {
		position: relative;
		aspect-ratio: 1;
		border-radius: 4px;
		overflow: hidden;
		background: #f6f7f7;
	}

	.sp-gallery-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.sp-gallery-remove {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: none;
		background: rgba(0,0,0,0.6);
		color: #fff;
		font-size: 14px;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity 0.15s;
	}

	.sp-gallery-item:hover .sp-gallery-remove {
		opacity: 1;
	}

	.sp-gallery-add-btn {
		aspect-ratio: 1;
		border: 2px dashed var(--sp-border, #c3c4c7);
		border-radius: 4px;
		background: transparent;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--sp-text-muted, #646970);
	}

	.sp-gallery-add-btn:hover {
		border-color: var(--sp-primary, #2271b1);
		color: var(--sp-primary, #2271b1);
	}

	.sp-gallery-placeholder {
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
