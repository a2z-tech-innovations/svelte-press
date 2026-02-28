<script lang="ts">
	import type { Block } from '$lib/types/index.js';

	let {
		block,
		onupdate
	}: {
		block: Block;
		onupdate: (block: Block) => void;
	} = $props();

	// Images array stored in block.attrs.images
	// Each item: { src: string; alt?: string; caption?: string }
	interface GalleryImage {
		src: string;
		alt: string;
		caption: string;
	}

	let images: GalleryImage[] = $derived(
		Array.isArray(block.attrs.images)
			? (block.attrs.images as GalleryImage[])
			: []
	);

	let uploading = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);

	function updateImages(next: GalleryImage[]) {
		onupdate({ ...block, attrs: { ...block.attrs, images: next } });
	}

	function updateImage(index: number, patch: Partial<GalleryImage>) {
		const next = images.map((img, i) => (i === index ? { ...img, ...patch } : img));
		updateImages(next);
	}

	function removeImage(index: number) {
		updateImages(images.filter((_, i) => i !== index));
	}

	async function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		if (files.length === 0) return;

		uploading = true;
		const uploaded: GalleryImage[] = [];

		for (const file of files) {
			try {
				const formData = new FormData();
				formData.append('file', file);
				const res = await fetch('/api/upload', { method: 'POST', body: formData });
				if (res.ok) {
					const data = await res.json();
					uploaded.push({ src: String(data.url), alt: '', caption: '' });
				}
			} catch {
				// skip failed uploads silently
			}
		}

		updateImages([...images, ...uploaded]);
		uploading = false;
		// Reset so same files can be re-selected
		input.value = '';
	}
</script>

<div class="sp-gallery-block">
	{#if images.length > 0}
		<div class="sp-gallery-editor-grid">
			{#each images as img, i}
				<div class="sp-gallery-editor-item">
					<img src={img.src} alt={img.alt || ''} class="sp-gallery-editor-thumb" />
					<div class="sp-gallery-editor-meta">
						<input
							type="text"
							class="sp-input"
							style="font-size:11px;padding:2px 6px;height:auto;"
							placeholder="Alt text"
							value={img.alt}
							oninput={(e) => updateImage(i, { alt: (e.target as HTMLInputElement).value })}
							onclick={(e) => e.stopPropagation()}
						/>
						<input
							type="text"
							class="sp-input"
							style="font-size:11px;padding:2px 6px;height:auto;margin-top:3px;"
							placeholder="Caption"
							value={img.caption}
							oninput={(e) => updateImage(i, { caption: (e.target as HTMLInputElement).value })}
							onclick={(e) => e.stopPropagation()}
						/>
					</div>
					<button
						type="button"
						class="sp-gallery-editor-remove"
						aria-label="Remove image"
						onclick={(e) => { e.stopPropagation(); removeImage(i); }}
					>
						&times;
					</button>
				</div>
			{/each}

			<!-- Add more images tile -->
			<button
				type="button"
				class="sp-gallery-editor-add"
				disabled={uploading}
				onclick={(e) => { e.stopPropagation(); fileInput?.click(); }}
			>
				{#if uploading}
					Uploading…
				{:else}
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
					</svg>
					<span>Add images</span>
				{/if}
			</button>
		</div>
	{:else}
		<div class="sp-gallery-placeholder" onclick={(e) => e.stopPropagation()}>
			<svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
				<rect x="1" y="1" width="15" height="15" rx="2" stroke="currentColor" stroke-width="1.5"/>
				<rect x="20" y="1" width="15" height="15" rx="2" stroke="currentColor" stroke-width="1.5"/>
				<rect x="1" y="20" width="15" height="15" rx="2" stroke="currentColor" stroke-width="1.5"/>
				<rect x="20" y="20" width="15" height="15" rx="2" stroke="currentColor" stroke-width="1.5"/>
			</svg>
			<p>Gallery block — upload images to build a gallery</p>
			<button
				type="button"
				class="sp-btn sp-btn-primary sp-btn-sm"
				disabled={uploading}
				onclick={() => fileInput?.click()}
			>
				{uploading ? 'Uploading…' : 'Upload Images'}
			</button>
		</div>
	{/if}

	<input
		bind:this={fileInput}
		type="file"
		accept="image/*"
		multiple
		style="display:none"
		onchange={handleFileChange}
	/>
</div>

<style>
	.sp-gallery-block {
		width: 100%;
	}

	.sp-gallery-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 28px;
		border: 2px dashed var(--sp-border);
		border-radius: 4px;
		background: #fafafa;
		color: var(--sp-text-muted);
		font-size: 13px;
		text-align: center;
	}

	/* ── Editor grid ── */
	.sp-gallery-editor-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 8px;
	}

	.sp-gallery-editor-item {
		position: relative;
		border: 1px solid var(--sp-border);
		border-radius: 4px;
		overflow: hidden;
		background: #fafafa;
	}

	.sp-gallery-editor-thumb {
		display: block;
		width: 100%;
		height: 90px;
		object-fit: cover;
	}

	.sp-gallery-editor-meta {
		padding: 4px 6px 6px;
	}

	.sp-gallery-editor-remove {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 20px;
		height: 20px;
		background: rgba(0,0,0,0.55);
		color: #fff;
		border: none;
		border-radius: 50%;
		font-size: 14px;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
	}

	.sp-gallery-editor-remove:hover {
		background: #d63638;
	}

	.sp-gallery-editor-add {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 90px;
		border: 2px dashed var(--sp-border);
		border-radius: 4px;
		background: #fafafa;
		color: var(--sp-text-muted);
		font-size: 12px;
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}

	.sp-gallery-editor-add:hover:not(:disabled) {
		border-color: var(--sp-primary);
		color: var(--sp-primary);
	}

	.sp-gallery-editor-add:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
