<script lang="ts">
	import type { Block } from '$lib/types/index.js';

	let {
		block,
		onupdate
	}: {
		block: Block;
		onupdate: (block: Block) => void;
	} = $props();

	let url = $derived(String(block.attrs.url ?? ''));
	let caption = $derived(String(block.attrs.caption ?? ''));
	let urlInput = $state(url);

	function applyUrl() {
		if (urlInput.trim()) {
			onupdate({ ...block, attrs: { ...block.attrs, url: urlInput.trim() } });
		}
	}

	function getYoutubeId(u: string): string | null {
		const match = u.match(
			/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
		);
		return match ? match[1] : null;
	}

	function getVimeoId(u: string): string | null {
		const match = u.match(/vimeo\.com\/(\d+)/);
		return match ? match[1] : null;
	}

	let embedType = $derived((): 'youtube' | 'vimeo' | 'link' | 'none' => {
		if (!url) return 'none';
		if (getYoutubeId(url)) return 'youtube';
		if (getVimeoId(url)) return 'vimeo';
		return 'link';
	});

	let iframeSrc = $derived((): string => {
		const type = embedType();
		if (type === 'youtube') {
			return `https://www.youtube.com/embed/${getYoutubeId(url)}`;
		}
		if (type === 'vimeo') {
			return `https://player.vimeo.com/video/${getVimeoId(url)}`;
		}
		return '';
	});
</script>

<div class="sp-embed-block">
	{#if !url}
		<div class="sp-embed-placeholder">
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
				<rect x="2" y="6" width="28" height="20" rx="2" stroke="currentColor" stroke-width="1.5"/>
				<path d="M13 12l8 4-8 4V12z" fill="currentColor" opacity="0.6"/>
			</svg>
			<p>Enter a URL to embed</p>
			<div class="sp-embed-url-row">
				<input
					type="url"
					class="sp-input"
					placeholder="https://youtube.com/watch?v=..."
					bind:value={urlInput}
					onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyUrl(); } }}
					style="flex:1"
					onclick={(e) => e.stopPropagation()}
				/>
				<button
					type="button"
					class="sp-btn sp-btn-primary sp-btn-sm"
					onclick={(e) => { e.stopPropagation(); applyUrl(); }}
				>Embed</button>
			</div>
		</div>
	{:else if embedType() === 'youtube' || embedType() === 'vimeo'}
		<figure class="sp-embed-figure">
			<div class="sp-embed-iframe-wrap">
				<iframe
					src={iframeSrc()}
					title="Embedded video"
					frameborder="0"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowfullscreen
					class="sp-embed-iframe"
				></iframe>
			</div>
			<div class="sp-embed-controls" onclick={(e) => e.stopPropagation()}>
				<input
					type="text"
					class="sp-embed-caption-input"
					placeholder="Add caption..."
					value={caption}
					oninput={(e) => onupdate({ ...block, attrs: { ...block.attrs, caption: (e.target as HTMLInputElement).value } })}
				/>
				<button
					type="button"
					class="sp-btn sp-btn-secondary sp-btn-sm"
					onclick={() => onupdate({ ...block, attrs: { ...block.attrs, url: '' } })}
				>Replace</button>
			</div>
		</figure>
	{:else}
		<div class="sp-embed-link-card" onclick={(e) => e.stopPropagation()}>
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
				<path d="M8 12l-4-4 4-4M12 8l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				<path d="M3 10h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
			</svg>
			<a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
			<button
				type="button"
				class="sp-btn sp-btn-secondary sp-btn-sm"
				onclick={() => onupdate({ ...block, attrs: { ...block.attrs, url: '' } })}
			>Replace</button>
		</div>
	{/if}
</div>

<style>
	.sp-embed-block {
		width: 100%;
	}

	.sp-embed-placeholder {
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

	.sp-embed-url-row {
		display: flex;
		gap: 8px;
		width: 100%;
		max-width: 480px;
	}

	.sp-embed-figure {
		margin: 0;
	}

	.sp-embed-iframe-wrap {
		position: relative;
		width: 100%;
		padding-top: 56.25%;
		background: #000;
		border-radius: 4px;
		overflow: hidden;
	}

	.sp-embed-iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		border: none;
	}

	.sp-embed-controls {
		display: flex;
		gap: 8px;
		margin-top: 8px;
		align-items: center;
	}

	.sp-embed-caption-input {
		flex: 1;
		border: none;
		border-bottom: 1px solid var(--sp-border);
		outline: none;
		font-size: 13px;
		color: var(--sp-text-muted);
		padding: 4px 0;
		background: transparent;
	}

	.sp-embed-link-card {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 16px;
		border: 1px solid var(--sp-border);
		border-radius: 4px;
		background: #f8f9fa;
		color: var(--sp-text-muted);
		font-size: 13px;
		overflow: hidden;
	}

	.sp-embed-link-card a {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--sp-primary);
	}
</style>
