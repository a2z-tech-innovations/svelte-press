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
		const match = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
		return match ? match[1] : null;
	}

	function getVimeoId(u: string): string | null {
		const match = u.match(/vimeo\.com\/(\d+)/);
		return match ? match[1] : null;
	}
</script>

<div class="sp-video-block">
	{#if !url}
		<div class="sp-video-placeholder">
			<svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
				<rect x="1" y="5" width="34" height="26" rx="2" stroke="currentColor" stroke-width="1.5"/>
				<path d="M14 12l12 6-12 6V12z" fill="currentColor" opacity="0.6"/>
			</svg>
			<p>Enter a video URL</p>
			<div class="sp-video-url-row">
				<input
					type="url"
					class="sp-input"
					placeholder="YouTube, Vimeo, or direct video URL..."
					bind:value={urlInput}
					onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyUrl(); } }}
					style="flex:1"
					onclick={(e) => e.stopPropagation()}
				/>
				<button type="button" class="sp-btn sp-btn-primary sp-btn-sm" onclick={(e) => { e.stopPropagation(); applyUrl(); }}>Add</button>
			</div>
		</div>
	{:else if getYoutubeId(url)}
		<figure class="sp-video-figure">
			<div class="sp-video-iframe-wrap">
				<iframe
					src="https://www.youtube.com/embed/{getYoutubeId(url)}"
					title="YouTube video"
					frameborder="0"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowfullscreen
					class="sp-video-iframe"
				></iframe>
			</div>
			<div class="sp-video-controls" onclick={(e) => e.stopPropagation()}>
				<input type="text" class="sp-video-caption" placeholder="Add caption..." value={caption} oninput={(e) => onupdate({ ...block, attrs: { ...block.attrs, caption: (e.target as HTMLInputElement).value } })} />
				<button type="button" class="sp-btn sp-btn-secondary sp-btn-sm" onclick={() => onupdate({ ...block, attrs: { ...block.attrs, url: '' } })}>Replace</button>
			</div>
		</figure>
	{:else if getVimeoId(url)}
		<figure class="sp-video-figure">
			<div class="sp-video-iframe-wrap">
				<iframe
					src="https://player.vimeo.com/video/{getVimeoId(url)}"
					title="Vimeo video"
					frameborder="0"
					allow="autoplay; fullscreen; picture-in-picture"
					allowfullscreen
					class="sp-video-iframe"
				></iframe>
			</div>
			<div class="sp-video-controls" onclick={(e) => e.stopPropagation()}>
				<input type="text" class="sp-video-caption" placeholder="Add caption..." value={caption} oninput={(e) => onupdate({ ...block, attrs: { ...block.attrs, caption: (e.target as HTMLInputElement).value } })} />
				<button type="button" class="sp-btn sp-btn-secondary sp-btn-sm" onclick={() => onupdate({ ...block, attrs: { ...block.attrs, url: '' } })}>Replace</button>
			</div>
		</figure>
	{:else}
		<figure class="sp-video-figure">
			<video src={url} controls class="sp-video-player">
				<track kind="captions" />
			</video>
			<div class="sp-video-controls" onclick={(e) => e.stopPropagation()}>
				<input type="text" class="sp-video-caption" placeholder="Add caption..." value={caption} oninput={(e) => onupdate({ ...block, attrs: { ...block.attrs, caption: (e.target as HTMLInputElement).value } })} />
				<button type="button" class="sp-btn sp-btn-secondary sp-btn-sm" onclick={() => onupdate({ ...block, attrs: { ...block.attrs, url: '' } })}>Replace</button>
			</div>
		</figure>
	{/if}
</div>

<style>
	.sp-video-placeholder {
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

	.sp-video-url-row {
		display: flex;
		gap: 8px;
		width: 100%;
		max-width: 480px;
	}

	.sp-video-figure {
		margin: 0;
	}

	.sp-video-iframe-wrap {
		position: relative;
		width: 100%;
		padding-top: 56.25%;
		background: #000;
		border-radius: 4px;
		overflow: hidden;
	}

	.sp-video-iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		border: none;
	}

	.sp-video-player {
		width: 100%;
		border-radius: 4px;
	}

	.sp-video-controls {
		display: flex;
		gap: 8px;
		margin-top: 8px;
		align-items: center;
	}

	.sp-video-caption {
		flex: 1;
		border: none;
		border-bottom: 1px solid var(--sp-border);
		outline: none;
		font-size: 13px;
		color: var(--sp-text-muted);
		padding: 4px 0;
		background: transparent;
	}
</style>
