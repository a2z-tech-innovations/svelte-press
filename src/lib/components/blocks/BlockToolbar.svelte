<script lang="ts">
	import type { Block } from '$lib/types/index.js';

	let {
		block,
		onmoveup,
		onmovedown,
		ondelete,
		onduplicate
	}: {
		block: Block;
		onmoveup: () => void;
		onmovedown: () => void;
		ondelete: () => void;
		onduplicate: () => void;
	} = $props();

	const typeLabels: Record<string, string> = {
		paragraph: 'Paragraph',
		heading: 'Heading',
		image: 'Image',
		gallery: 'Gallery',
		video: 'Video',
		quote: 'Quote',
		pullquote: 'Pullquote',
		code: 'Code',
		preformatted: 'Preformatted',
		list: 'List',
		separator: 'Separator',
		spacer: 'Spacer',
		table: 'Table',
		columns: 'Columns',
		button: 'Button',
		embed: 'Embed',
		html: 'HTML',
		shortcode: 'Shortcode'
	};
</script>

<div class="sp-block-toolbar" onclick={(e) => e.stopPropagation()}>
	<span class="sp-block-toolbar-type">{typeLabels[block.type] ?? block.type}</span>

	<div class="sp-block-toolbar-sep"></div>

	<button
		type="button"
		class="sp-block-toolbar-btn"
		title="Move up"
		onclick={(e) => { e.stopPropagation(); onmoveup(); }}
		aria-label="Move block up"
	>
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
			<path d="M7 11V3M3 7l4-4 4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
	</button>

	<button
		type="button"
		class="sp-block-toolbar-btn"
		title="Move down"
		onclick={(e) => { e.stopPropagation(); onmovedown(); }}
		aria-label="Move block down"
	>
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
			<path d="M7 3v8M3 7l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
	</button>

	<button
		type="button"
		class="sp-block-toolbar-btn"
		title="Duplicate block"
		onclick={(e) => { e.stopPropagation(); onduplicate(); }}
		aria-label="Duplicate block"
	>
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
			<rect x="5" y="1" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.4"/>
			<path d="M3 5H2a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1v-1" stroke="currentColor" stroke-width="1.4"/>
		</svg>
	</button>

	<button
		type="button"
		class="sp-block-toolbar-btn sp-block-toolbar-btn-danger"
		title="Delete block"
		onclick={(e) => { e.stopPropagation(); ondelete(); }}
		aria-label="Delete block"
	>
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
			<path d="M2 4h10M5 4V2h4v2M5.5 6.5v4M8.5 6.5v4M3 4l.7 8h6.6L11 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
	</button>
</div>

<style>
	.sp-block-toolbar {
		position: absolute;
		top: -36px;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		gap: 2px;
		background: #fff;
		border: 1px solid var(--sp-border);
		border-radius: 4px;
		padding: 3px 6px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		z-index: 10;
		width: fit-content;
		max-width: 100%;
	}

	.sp-block-toolbar-type {
		font-size: 11px;
		font-weight: 600;
		color: var(--sp-text-muted);
		padding: 0 4px;
		white-space: nowrap;
	}

	.sp-block-toolbar-sep {
		width: 1px;
		height: 18px;
		background: var(--sp-border);
		margin: 0 2px;
	}

	.sp-block-toolbar-btn {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		border-radius: 3px;
		cursor: pointer;
		color: var(--sp-text-muted);
		transition: background-color 0.1s, color 0.1s;
		flex-shrink: 0;
	}

	.sp-block-toolbar-btn:hover {
		background: #f0f0f1;
		color: var(--sp-text);
	}

	.sp-block-toolbar-btn-danger:hover {
		background: #fde7e7;
		color: var(--sp-error);
	}
</style>
