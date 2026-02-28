<script lang="ts">
	import { untrack } from 'svelte';
	import { nanoid } from 'nanoid';
	import type { Block } from '$lib/types/index.js';

	// Individual block components for nested rendering
	import ParagraphBlock from './ParagraphBlock.svelte';
	import HeadingBlock from './HeadingBlock.svelte';
	import ImageBlock from './ImageBlock.svelte';
	import GalleryBlock from './GalleryBlock.svelte';
	import VideoBlock from './VideoBlock.svelte';
	import QuoteBlock from './QuoteBlock.svelte';
	import PullquoteBlock from './PullquoteBlock.svelte';
	import CodeBlock from './CodeBlock.svelte';
	import PreformattedBlock from './PreformattedBlock.svelte';
	import ListBlock from './ListBlock.svelte';
	import SeparatorBlock from './SeparatorBlock.svelte';
	import SpacerBlock from './SpacerBlock.svelte';
	import TableBlock from './TableBlock.svelte';
	import ButtonBlock from './ButtonBlock.svelte';
	import EmbedBlock from './EmbedBlock.svelte';
	import HtmlBlock from './HtmlBlock.svelte';
	import ShortcodeBlock from './ShortcodeBlock.svelte';

	let {
		block,
		onupdate
	}: {
		block: Block;
		onupdate: (block: Block) => void;
	} = $props();

	// Parse blocks arrays from attrs — re-sync when the parent block's id changes
	let leftBlocks = $state<Block[]>((block.attrs.leftBlocks as Block[]) ?? []);
	let rightBlocks = $state<Block[]>((block.attrs.rightBlocks as Block[]) ?? []);
	let columns = $derived(Number(block.attrs.columns ?? 2));

	let prevId = $state(block.id);

	$effect(() => {
		const id = block.id;
		if (id !== prevId) {
			prevId = id;
			untrack(() => {
				leftBlocks = (block.attrs.leftBlocks as Block[]) ?? [];
				rightBlocks = (block.attrs.rightBlocks as Block[]) ?? [];
			});
		}
	});

	// Inline inserter state — tracks which column and which dropdowns are open
	let leftInserterOpen = $state(false);
	let rightInserterOpen = $state(false);

	// Which nested block is currently selected (for showing delete/move controls)
	let selectedNestedId = $state<string | null>(null);

	// ── helpers ──────────────────────────────────────────────────────────────

	function syncToParent(nextLeft: Block[], nextRight: Block[]) {
		onupdate({
			...block,
			attrs: { ...block.attrs, leftBlocks: nextLeft, rightBlocks: nextRight }
		});
	}

	function makeBlock(type: string): Block {
		const defaults: Record<string, { content: string; attrs: Record<string, unknown> }> = {
			paragraph: { content: '', attrs: {} },
			heading: { content: '', attrs: { level: 2 } },
			image: { content: '', attrs: { src: '', alt: '', caption: '', align: 'none' } },
			gallery: { content: '', attrs: { images: [] } },
			video: { content: '', attrs: { url: '', caption: '' } },
			quote: { content: '', attrs: { citation: '' } },
			pullquote: { content: '', attrs: { citation: '' } },
			code: { content: '', attrs: { language: 'plaintext' } },
			preformatted: { content: '', attrs: {} },
			list: { content: '', attrs: { ordered: false, items: [''] } },
			separator: { content: '', attrs: { style: 'default' } },
			spacer: { content: '', attrs: { height: 40 } },
			table: { content: '', attrs: { rows: [['', ''], ['', '']], hasHeader: true } },
			button: { content: 'Click here', attrs: { url: '', target: '_self', style: 'fill' } },
			embed: { content: '', attrs: { url: '', caption: '' } },
			html: { content: '', attrs: {} },
			shortcode: { content: '', attrs: {} }
		};
		const d = defaults[type] ?? { content: '', attrs: {} };
		return { id: nanoid(), type: type as Block['type'], content: d.content, attrs: d.attrs };
	}

	// ── block operations per column ───────────────────────────────────────────

	function addBlock(column: 'left' | 'right', type: string) {
		const nb = makeBlock(type);
		if (column === 'left') {
			const next = [...leftBlocks, nb];
			leftBlocks = next;
			syncToParent(next, rightBlocks);
			leftInserterOpen = false;
		} else {
			const next = [...rightBlocks, nb];
			rightBlocks = next;
			syncToParent(leftBlocks, next);
			rightInserterOpen = false;
		}
		selectedNestedId = nb.id;
	}

	function updateBlock(column: 'left' | 'right', updated: Block) {
		if (column === 'left') {
			const next = leftBlocks.map((b) => (b.id === updated.id ? updated : b));
			leftBlocks = next;
			syncToParent(next, rightBlocks);
		} else {
			const next = rightBlocks.map((b) => (b.id === updated.id ? updated : b));
			rightBlocks = next;
			syncToParent(leftBlocks, next);
		}
	}

	function removeBlock(column: 'left' | 'right', id: string) {
		if (column === 'left') {
			const next = leftBlocks.filter((b) => b.id !== id);
			leftBlocks = next;
			syncToParent(next, rightBlocks);
		} else {
			const next = rightBlocks.filter((b) => b.id !== id);
			rightBlocks = next;
			syncToParent(leftBlocks, next);
		}
		if (selectedNestedId === id) selectedNestedId = null;
	}

	function moveBlock(column: 'left' | 'right', id: string, dir: 'up' | 'down') {
		const arr = column === 'left' ? [...leftBlocks] : [...rightBlocks];
		const i = arr.findIndex((b) => b.id === id);
		if (dir === 'up' && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
		if (dir === 'down' && i < arr.length - 1) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
		if (column === 'left') {
			leftBlocks = arr;
			syncToParent(arr, rightBlocks);
		} else {
			rightBlocks = arr;
			syncToParent(leftBlocks, arr);
		}
	}

	// Allowed types for the inline column inserter — excludes 'columns' to avoid infinite nesting
	type InlineBlockDef = { type: string; label: string };
	const inlineBlockTypes: InlineBlockDef[] = [
		{ type: 'paragraph', label: 'Paragraph' },
		{ type: 'heading', label: 'Heading' },
		{ type: 'list', label: 'List' },
		{ type: 'quote', label: 'Quote' },
		{ type: 'pullquote', label: 'Pullquote' },
		{ type: 'code', label: 'Code' },
		{ type: 'preformatted', label: 'Preformatted' },
		{ type: 'html', label: 'HTML' },
		{ type: 'shortcode', label: 'Shortcode' },
		{ type: 'image', label: 'Image' },
		{ type: 'gallery', label: 'Gallery' },
		{ type: 'video', label: 'Video' },
		{ type: 'button', label: 'Button' },
		{ type: 'embed', label: 'Embed' },
		{ type: 'separator', label: 'Separator' },
		{ type: 'spacer', label: 'Spacer' },
		{ type: 'table', label: 'Table' }
	];
</script>

<!-- Stop outer block editor from capturing clicks inside the columns block -->
<div class="sp-columns-block" onclick={(e) => e.stopPropagation()}>

	<!-- Column count toolbar -->
	<div class="sp-columns-toolbar">
		<span class="sp-columns-label">Columns:</span>
		{#each [2, 3] as n}
			<button
				type="button"
				class="sp-columns-btn"
				class:active={columns === n}
				onclick={() => onupdate({ ...block, attrs: { ...block.attrs, columns: n } })}
			>{n}</button>
		{/each}
	</div>

	<!-- Column grid — always 2 editable columns (left / right) regardless of display count -->
	<div class="sp-columns-grid" style="grid-template-columns: repeat({columns}, 1fr)">

		<!-- ── Left column ──────────────────────────────────────────────── -->
		<div class="sp-col-zone">
			<div class="sp-col-header">Column 1</div>

			{#if leftBlocks.length === 0}
				<div class="sp-col-empty">Empty — add a block below</div>
			{/if}

			{#each leftBlocks as nb, idx (nb.id)}
				<div
					class="sp-nested-block"
					class:sp-nested-selected={selectedNestedId === nb.id}
					onclick={(e) => { e.stopPropagation(); selectedNestedId = nb.id; }}
				>
					<!-- Mini toolbar: move up / move down / delete -->
					{#if selectedNestedId === nb.id}
						<div class="sp-nested-toolbar">
							<button
								type="button"
								class="sp-nested-tool-btn"
								title="Move up"
								disabled={idx === 0}
								onclick={(e) => { e.stopPropagation(); moveBlock('left', nb.id, 'up'); }}
							>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
									<path d="M5 8V2M2 5l3-3 3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
							</button>
							<button
								type="button"
								class="sp-nested-tool-btn"
								title="Move down"
								disabled={idx === leftBlocks.length - 1}
								onclick={(e) => { e.stopPropagation(); moveBlock('left', nb.id, 'down'); }}
							>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
									<path d="M5 2v6M2 5l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
							</button>
							<button
								type="button"
								class="sp-nested-tool-btn sp-nested-tool-delete"
								title="Delete block"
								onclick={(e) => { e.stopPropagation(); removeBlock('left', nb.id); }}
							>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
									<path d="M2 2l6 6M8 2L2 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
								</svg>
							</button>
						</div>
					{/if}

					<!-- Render the actual nested block component -->
					<div class="sp-nested-content">
						{#if nb.type === 'paragraph'}
							<ParagraphBlock block={nb} onupdate={(u: Block) => updateBlock('left', u)} />
						{:else if nb.type === 'heading'}
							<HeadingBlock block={nb} onupdate={(u: Block) => updateBlock('left', u)} />
						{:else if nb.type === 'image'}
							<ImageBlock block={nb} onupdate={(u: Block) => updateBlock('left', u)} />
						{:else if nb.type === 'gallery'}
							<GalleryBlock block={nb} onupdate={(u: Block) => updateBlock('left', u)} />
						{:else if nb.type === 'video'}
							<VideoBlock block={nb} onupdate={(u: Block) => updateBlock('left', u)} />
						{:else if nb.type === 'quote'}
							<QuoteBlock block={nb} onupdate={(u: Block) => updateBlock('left', u)} />
						{:else if nb.type === 'pullquote'}
							<PullquoteBlock block={nb} onupdate={(u: Block) => updateBlock('left', u)} />
						{:else if nb.type === 'code'}
							<CodeBlock block={nb} onupdate={(u: Block) => updateBlock('left', u)} />
						{:else if nb.type === 'preformatted'}
							<PreformattedBlock block={nb} onupdate={(u: Block) => updateBlock('left', u)} />
						{:else if nb.type === 'list'}
							<ListBlock block={nb} onupdate={(u: Block) => updateBlock('left', u)} />
						{:else if nb.type === 'separator'}
							<SeparatorBlock block={nb} onupdate={(u: Block) => updateBlock('left', u)} />
						{:else if nb.type === 'spacer'}
							<SpacerBlock block={nb} onupdate={(u: Block) => updateBlock('left', u)} />
						{:else if nb.type === 'table'}
							<TableBlock block={nb} onupdate={(u: Block) => updateBlock('left', u)} />
						{:else if nb.type === 'button'}
							<ButtonBlock block={nb} onupdate={(u: Block) => updateBlock('left', u)} />
						{:else if nb.type === 'embed'}
							<EmbedBlock block={nb} onupdate={(u: Block) => updateBlock('left', u)} />
						{:else if nb.type === 'html'}
							<HtmlBlock block={nb} onupdate={(u: Block) => updateBlock('left', u)} />
						{:else if nb.type === 'shortcode'}
							<ShortcodeBlock block={nb} onupdate={(u: Block) => updateBlock('left', u)} />
						{/if}
					</div>
				</div>
			{/each}

			<!-- Inline block inserter for left column -->
			<div class="sp-col-inserter">
				{#if leftInserterOpen}
					<div class="sp-col-inserter-dropdown" onclick={(e) => e.stopPropagation()}>
						<div class="sp-col-inserter-header">
							<span>Add block</span>
							<button
								type="button"
								class="sp-col-inserter-close"
								onclick={(e) => { e.stopPropagation(); leftInserterOpen = false; }}
								aria-label="Close"
							>
								<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
									<path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
								</svg>
							</button>
						</div>
						<div class="sp-col-inserter-list">
							{#each inlineBlockTypes as def}
								<button
									type="button"
									class="sp-col-inserter-item"
									onclick={(e) => { e.stopPropagation(); addBlock('left', def.type); }}
								>{def.label}</button>
							{/each}
						</div>
					</div>
				{/if}
				<button
					type="button"
					class="sp-col-add-btn"
					onclick={(e) => { e.stopPropagation(); leftInserterOpen = !leftInserterOpen; rightInserterOpen = false; }}
				>
					<svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
						<path d="M5.5 1v9M1 5.5h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
					</svg>
					Add block
				</button>
			</div>
		</div>

		<!-- ── Right column ─────────────────────────────────────────────── -->
		<div class="sp-col-zone">
			<div class="sp-col-header">Column 2</div>

			{#if rightBlocks.length === 0}
				<div class="sp-col-empty">Empty — add a block below</div>
			{/if}

			{#each rightBlocks as nb, idx (nb.id)}
				<div
					class="sp-nested-block"
					class:sp-nested-selected={selectedNestedId === nb.id}
					onclick={(e) => { e.stopPropagation(); selectedNestedId = nb.id; }}
				>
					<!-- Mini toolbar: move up / move down / delete -->
					{#if selectedNestedId === nb.id}
						<div class="sp-nested-toolbar">
							<button
								type="button"
								class="sp-nested-tool-btn"
								title="Move up"
								disabled={idx === 0}
								onclick={(e) => { e.stopPropagation(); moveBlock('right', nb.id, 'up'); }}
							>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
									<path d="M5 8V2M2 5l3-3 3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
							</button>
							<button
								type="button"
								class="sp-nested-tool-btn"
								title="Move down"
								disabled={idx === rightBlocks.length - 1}
								onclick={(e) => { e.stopPropagation(); moveBlock('right', nb.id, 'down'); }}
							>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
									<path d="M5 2v6M2 5l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
							</button>
							<button
								type="button"
								class="sp-nested-tool-btn sp-nested-tool-delete"
								title="Delete block"
								onclick={(e) => { e.stopPropagation(); removeBlock('right', nb.id); }}
							>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
									<path d="M2 2l6 6M8 2L2 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
								</svg>
							</button>
						</div>
					{/if}

					<!-- Render the actual nested block component -->
					<div class="sp-nested-content">
						{#if nb.type === 'paragraph'}
							<ParagraphBlock block={nb} onupdate={(u: Block) => updateBlock('right', u)} />
						{:else if nb.type === 'heading'}
							<HeadingBlock block={nb} onupdate={(u: Block) => updateBlock('right', u)} />
						{:else if nb.type === 'image'}
							<ImageBlock block={nb} onupdate={(u: Block) => updateBlock('right', u)} />
						{:else if nb.type === 'gallery'}
							<GalleryBlock block={nb} onupdate={(u: Block) => updateBlock('right', u)} />
						{:else if nb.type === 'video'}
							<VideoBlock block={nb} onupdate={(u: Block) => updateBlock('right', u)} />
						{:else if nb.type === 'quote'}
							<QuoteBlock block={nb} onupdate={(u: Block) => updateBlock('right', u)} />
						{:else if nb.type === 'pullquote'}
							<PullquoteBlock block={nb} onupdate={(u: Block) => updateBlock('right', u)} />
						{:else if nb.type === 'code'}
							<CodeBlock block={nb} onupdate={(u: Block) => updateBlock('right', u)} />
						{:else if nb.type === 'preformatted'}
							<PreformattedBlock block={nb} onupdate={(u: Block) => updateBlock('right', u)} />
						{:else if nb.type === 'list'}
							<ListBlock block={nb} onupdate={(u: Block) => updateBlock('right', u)} />
						{:else if nb.type === 'separator'}
							<SeparatorBlock block={nb} onupdate={(u: Block) => updateBlock('right', u)} />
						{:else if nb.type === 'spacer'}
							<SpacerBlock block={nb} onupdate={(u: Block) => updateBlock('right', u)} />
						{:else if nb.type === 'table'}
							<TableBlock block={nb} onupdate={(u: Block) => updateBlock('right', u)} />
						{:else if nb.type === 'button'}
							<ButtonBlock block={nb} onupdate={(u: Block) => updateBlock('right', u)} />
						{:else if nb.type === 'embed'}
							<EmbedBlock block={nb} onupdate={(u: Block) => updateBlock('right', u)} />
						{:else if nb.type === 'html'}
							<HtmlBlock block={nb} onupdate={(u: Block) => updateBlock('right', u)} />
						{:else if nb.type === 'shortcode'}
							<ShortcodeBlock block={nb} onupdate={(u: Block) => updateBlock('right', u)} />
						{/if}
					</div>
				</div>
			{/each}

			<!-- Inline block inserter for right column -->
			<div class="sp-col-inserter">
				{#if rightInserterOpen}
					<div class="sp-col-inserter-dropdown" onclick={(e) => e.stopPropagation()}>
						<div class="sp-col-inserter-header">
							<span>Add block</span>
							<button
								type="button"
								class="sp-col-inserter-close"
								onclick={(e) => { e.stopPropagation(); rightInserterOpen = false; }}
								aria-label="Close"
							>
								<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
									<path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
								</svg>
							</button>
						</div>
						<div class="sp-col-inserter-list">
							{#each inlineBlockTypes as def}
								<button
									type="button"
									class="sp-col-inserter-item"
									onclick={(e) => { e.stopPropagation(); addBlock('right', def.type); }}
								>{def.label}</button>
							{/each}
						</div>
					</div>
				{/if}
				<button
					type="button"
					class="sp-col-add-btn"
					onclick={(e) => { e.stopPropagation(); rightInserterOpen = !rightInserterOpen; leftInserterOpen = false; }}
				>
					<svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
						<path d="M5.5 1v9M1 5.5h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
					</svg>
					Add block
				</button>
			</div>
		</div>

	</div><!-- /.sp-columns-grid -->
</div>

<!-- Clicking outside the columns block deselects any nested block -->
<svelte:document onclick={() => { selectedNestedId = null; leftInserterOpen = false; rightInserterOpen = false; }} />

<style>
	.sp-columns-block {
		width: 100%;
	}

	/* ── Column count toolbar ── */
	.sp-columns-toolbar {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 10px;
	}

	.sp-columns-label {
		font-size: 12px;
		color: var(--sp-text-muted);
	}

	.sp-columns-btn {
		width: 28px;
		height: 24px;
		border: 1px solid var(--sp-border);
		border-radius: 3px;
		background: #fff;
		font-size: 12px;
		color: var(--sp-text-muted);
		cursor: pointer;
		transition: background-color 0.1s, color 0.1s;
	}

	.sp-columns-btn.active {
		background: var(--sp-primary);
		border-color: var(--sp-primary);
		color: #fff;
	}

	/* ── Column grid ── */
	.sp-columns-grid {
		display: grid;
		gap: 12px;
		align-items: start;
	}

	/* ── Individual column zone ── */
	.sp-col-zone {
		border: 2px dashed var(--sp-border);
		border-radius: 4px;
		padding: 10px;
		background: #fafafa;
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-height: 80px;
	}

	.sp-col-header {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--sp-text-muted);
		margin-bottom: 4px;
		padding-bottom: 4px;
		border-bottom: 1px solid var(--sp-border);
	}

	.sp-col-empty {
		font-size: 12px;
		color: #c3c4c7;
		text-align: center;
		padding: 12px 0;
		flex: 1;
	}

	/* ── Nested block wrapper ── */
	.sp-nested-block {
		position: relative;
		border: 1px solid transparent;
		border-radius: 3px;
		cursor: text;
		transition: border-color 0.15s;
		background: #fff;
	}

	.sp-nested-block:hover {
		border-color: var(--sp-border);
	}

	.sp-nested-selected {
		border-color: var(--sp-primary) !important;
	}

	.sp-nested-content {
		padding: 4px 6px;
	}

	/* ── Mini toolbar (move up / down / delete) ── */
	.sp-nested-toolbar {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 3px 4px;
		border-bottom: 1px solid #e8e8e8;
		background: #f6f7f7;
		border-radius: 3px 3px 0 0;
	}

	.sp-nested-tool-btn {
		width: 22px;
		height: 22px;
		border: 1px solid transparent;
		border-radius: 3px;
		background: none;
		color: var(--sp-text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background-color 0.1s, color 0.1s, border-color 0.1s;
		padding: 0;
	}

	.sp-nested-tool-btn:hover:not(:disabled) {
		background: #e7e7e7;
		border-color: var(--sp-border);
		color: var(--sp-text);
	}

	.sp-nested-tool-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.sp-nested-tool-delete:hover:not(:disabled) {
		background: #fceaea;
		border-color: var(--sp-error);
		color: var(--sp-error);
	}

	/* ── Inline column inserter ── */
	.sp-col-inserter {
		position: relative;
		margin-top: 6px;
	}

	.sp-col-add-btn {
		display: flex;
		align-items: center;
		gap: 5px;
		width: 100%;
		padding: 5px 8px;
		border: 1px dashed var(--sp-border);
		border-radius: 3px;
		background: none;
		font-size: 11px;
		color: var(--sp-text-muted);
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s, background-color 0.15s;
		justify-content: center;
	}

	.sp-col-add-btn:hover {
		border-color: var(--sp-primary);
		color: var(--sp-primary);
		background: #f0f6fc;
	}

	.sp-col-inserter-dropdown {
		position: absolute;
		bottom: calc(100% + 4px);
		left: 0;
		right: 0;
		background: #fff;
		border: 1px solid var(--sp-border);
		border-radius: 5px;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.14);
		z-index: 200;
		overflow: hidden;
	}

	.sp-col-inserter-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 7px 10px;
		border-bottom: 1px solid var(--sp-border);
		font-size: 11px;
		font-weight: 600;
		color: var(--sp-text);
	}

	.sp-col-inserter-close {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--sp-text-muted);
		display: flex;
		align-items: center;
		padding: 2px;
		border-radius: 3px;
	}

	.sp-col-inserter-close:hover {
		color: var(--sp-text);
	}

	.sp-col-inserter-list {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2px;
		padding: 6px;
		max-height: 220px;
		overflow-y: auto;
	}

	.sp-col-inserter-item {
		padding: 5px 8px;
		border: 1px solid transparent;
		border-radius: 3px;
		background: none;
		font-size: 11px;
		color: var(--sp-text);
		cursor: pointer;
		text-align: left;
		transition: background-color 0.1s, border-color 0.1s;
	}

	.sp-col-inserter-item:hover {
		background: #f0f0f1;
		border-color: var(--sp-border);
	}
</style>
