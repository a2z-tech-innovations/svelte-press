<script lang="ts">
	import type { Block } from '$lib/types/index.js';

	let {
		block,
		onupdate
	}: {
		block: Block;
		onupdate: (block: Block) => void;
	} = $props();

	let fileInput = $state<HTMLInputElement | null>(null);
	let uploading = $state(false);
	let urlInput = $state('');
	let urlMode = $state(false);

	let src = $derived(String(block.attrs.src ?? ''));
	let alt = $derived(String(block.attrs.alt ?? ''));
	let caption = $derived(String(block.attrs.caption ?? ''));
	let align = $derived(String(block.attrs.align ?? 'none') as 'none' | 'left' | 'center' | 'right');

	function updateAttr(key: string, value: unknown) {
		onupdate({ ...block, attrs: { ...block.attrs, [key]: value } });
	}

	async function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		uploading = true;
		try {
			const formData = new FormData();
			formData.append('file', file);
			const res = await fetch('/api/upload', { method: 'POST', body: formData });
			if (res.ok) {
				const data = await res.json();
				updateAttr('src', data.url);
			} else {
				alert('Upload failed');
			}
		} catch {
			alert('Upload error');
		} finally {
			uploading = false;
		}
	}

	function applyUrl() {
		if (urlInput.trim()) {
			updateAttr('src', urlInput.trim());
			urlInput = '';
			urlMode = false;
		}
	}

	const alignStyles: Record<string, string> = {
		none: '',
		left: 'margin-right:auto',
		center: 'margin:0 auto',
		right: 'margin-left:auto'
	};
</script>

<div class="sp-image-block">
	{#if src}
		<figure class="sp-image-figure" style={alignStyles[align]}>
			<img
				{src}
				{alt}
				class="sp-image-img"
				onclick={(e) => e.stopPropagation()}
				style={align === 'center' ? 'display:block;margin:0 auto' : ''}
			/>
			<div class="sp-image-controls">
				<button
					type="button"
					class="sp-btn sp-btn-sm sp-btn-secondary"
					onclick={(e) => { e.stopPropagation(); updateAttr('src', ''); }}
				>Replace</button>
				<select
					class="sp-select"
					style="font-size:12px;padding:3px 6px;height:auto;"
					value={align}
					onchange={(e) => updateAttr('align', (e.target as HTMLSelectElement).value)}
					onclick={(e) => e.stopPropagation()}
				>
					<option value="none">Align: None</option>
					<option value="left">Left</option>
					<option value="center">Center</option>
					<option value="right">Right</option>
				</select>
			</div>
			<input
				type="text"
				class="sp-input sp-image-alt-input"
				placeholder="Alt text..."
				value={alt}
				oninput={(e) => updateAttr('alt', (e.target as HTMLInputElement).value)}
				onclick={(e) => e.stopPropagation()}
			/>
			<figcaption>
				<input
					type="text"
					class="sp-image-caption-input"
					placeholder="Add caption..."
					value={caption}
					oninput={(e) => updateAttr('caption', (e.target as HTMLInputElement).value)}
					onclick={(e) => e.stopPropagation()}
				/>
			</figcaption>
		</figure>
	{:else}
		<div class="sp-image-placeholder" onclick={(e) => e.stopPropagation()}>
			<svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
				<rect x="2" y="5" width="36" height="30" rx="2" stroke="currentColor" stroke-width="1.5"/>
				<circle cx="13" cy="15" r="4" stroke="currentColor" stroke-width="1.5"/>
				<path d="M2 28l10-10 8 8 5-5 13 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
			<p>Upload an image or paste a URL</p>
			<div class="sp-image-actions">
				<button
					type="button"
					class="sp-btn sp-btn-primary sp-btn-sm"
					disabled={uploading}
					onclick={() => fileInput?.click()}
				>
					{uploading ? 'Uploading…' : 'Upload Image'}
				</button>
				<button
					type="button"
					class="sp-btn sp-btn-secondary sp-btn-sm"
					onclick={() => (urlMode = !urlMode)}
				>Insert from URL</button>
			</div>
			{#if urlMode}
				<div class="sp-image-url-row">
					<input
						type="url"
						class="sp-input"
						placeholder="https://..."
						bind:value={urlInput}
						onkeydown={(e) => { if (e.key === 'Enter') applyUrl(); }}
						style="flex:1"
					/>
					<button type="button" class="sp-btn sp-btn-primary sp-btn-sm" onclick={applyUrl}>Apply</button>
				</div>
			{/if}
		</div>
		<input
			bind:this={fileInput}
			type="file"
			accept="image/*"
			style="display:none"
			onchange={handleFileChange}
		/>
	{/if}
</div>

<style>
	.sp-image-block {
		width: 100%;
	}

	.sp-image-figure {
		margin: 0;
		display: block;
	}

	.sp-image-img {
		max-width: 100%;
		height: auto;
		display: block;
		border-radius: 2px;
	}

	.sp-image-controls {
		display: flex;
		gap: 6px;
		margin-top: 8px;
		align-items: center;
	}

	.sp-image-alt-input {
		margin-top: 6px;
		font-size: 12px;
	}

	.sp-image-caption-input {
		width: 100%;
		border: none;
		border-bottom: 1px solid var(--sp-border);
		outline: none;
		font-size: 13px;
		color: var(--sp-text-muted);
		padding: 4px 0;
		margin-top: 4px;
		background: transparent;
	}

	.sp-image-caption-input::placeholder {
		color: #c3c4c7;
	}

	.sp-image-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 32px;
		border: 2px dashed var(--sp-border);
		border-radius: 4px;
		background: #fafafa;
		color: var(--sp-text-muted);
		font-size: 14px;
	}

	.sp-image-actions {
		display: flex;
		gap: 8px;
	}

	.sp-image-url-row {
		display: flex;
		gap: 8px;
		width: 100%;
		max-width: 400px;
	}
</style>
