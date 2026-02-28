<script lang="ts">
	import { nanoid } from 'nanoid';
	import type { Block, BlockType } from '$lib/types/index.js';

	import BlockInserter from './BlockInserter.svelte';
	import BlockToolbar from './BlockToolbar.svelte';
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
	import ColumnsBlock from './ColumnsBlock.svelte';
	import ButtonBlock from './ButtonBlock.svelte';
	import EmbedBlock from './EmbedBlock.svelte';
	import HtmlBlock from './HtmlBlock.svelte';
	import ShortcodeBlock from './ShortcodeBlock.svelte';

	let {
		blocks: initialBlocks,
		onchange
	}: {
		blocks: Block[];
		onchange: (blocks: Block[]) => void;
	} = $props();

	let blocks = $state<Block[]>(initialBlocks ?? []);
	let selectedId = $state<string | null>(null);
	let showInserter = $state(false);
	let inserterAfterIndex = $state<number>(-1);

	$effect(() => {
		onchange(blocks);
	});

	function createBlock(type: BlockType): Block {
		const defaults: Record<BlockType, { content: string; attrs: Record<string, unknown> }> = {
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
			columns: { content: '', attrs: { columns: 2, leftBlocks: [], rightBlocks: [] } },
			button: { content: 'Click here', attrs: { url: '', target: '_self', style: 'fill' } },
			embed: { content: '', attrs: { url: '', caption: '' } },
			html: { content: '', attrs: {} },
			shortcode: { content: '', attrs: {} }
		};
		const d = defaults[type] ?? { content: '', attrs: {} };
		return { id: nanoid(), type, content: d.content, attrs: d.attrs };
	}

	function insertBlock(type: string) {
		const block = createBlock(type as BlockType);
		const idx = inserterAfterIndex;
		const next = [...blocks];
		next.splice(idx + 1, 0, block);
		blocks = next;
		selectedId = block.id;
		showInserter = false;
	}

	function updateBlock(id: string, updated: Block) {
		blocks = blocks.map((b) => (b.id === id ? updated : b));
	}

	function deleteBlock(id: string) {
		blocks = blocks.filter((b) => b.id !== id);
		if (selectedId === id) selectedId = null;
	}

	function moveBlockUp(id: string) {
		const idx = blocks.findIndex((b) => b.id === id);
		if (idx <= 0) return;
		const next = [...blocks];
		[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
		blocks = next;
	}

	function moveBlockDown(id: string) {
		const idx = blocks.findIndex((b) => b.id === id);
		if (idx < 0 || idx >= blocks.length - 1) return;
		const next = [...blocks];
		[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
		blocks = next;
	}

	function duplicateBlock(id: string) {
		const idx = blocks.findIndex((b) => b.id === id);
		if (idx < 0) return;
		const original = blocks[idx];
		const copy: Block = { ...original, attrs: { ...original.attrs }, id: nanoid() };
		const next = [...blocks];
		next.splice(idx + 1, 0, copy);
		blocks = next;
		selectedId = copy.id;
	}

	function openInserter(afterIndex: number) {
		inserterAfterIndex = afterIndex;
		showInserter = true;
	}
</script>

<div class="sp-block-editor">
	{#if blocks.length === 0}
		<div class="sp-block-editor-empty">
			<p>Start writing or</p>
			<button
				type="button"
				class="sp-btn sp-btn-secondary sp-btn-sm"
				onclick={() => openInserter(-1)}
			>
				<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
					<path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
				</svg>
				Add block
			</button>
		</div>
	{/if}

	{#each blocks as block, index (block.id)}
		<div
			class="sp-block-wrapper"
			class:sp-block-selected={selectedId === block.id}
			onclick={(e) => {
				e.stopPropagation();
				selectedId = block.id;
			}}
		>
			{#if selectedId === block.id}
				<BlockToolbar
					{block}
					onmoveup={() => moveBlockUp(block.id)}
					onmovedown={() => moveBlockDown(block.id)}
					ondelete={() => deleteBlock(block.id)}
					onduplicate={() => duplicateBlock(block.id)}
				/>
			{/if}

			<div class="sp-block-content">
				{#if block.type === 'paragraph'}
					<ParagraphBlock {block} onupdate={(b: Block) => updateBlock(block.id, b)} />
				{:else if block.type === 'heading'}
					<HeadingBlock {block} onupdate={(b: Block) => updateBlock(block.id, b)} />
				{:else if block.type === 'image'}
					<ImageBlock {block} onupdate={(b: Block) => updateBlock(block.id, b)} />
				{:else if block.type === 'gallery'}
					<GalleryBlock {block} onupdate={(b: Block) => updateBlock(block.id, b)} />
				{:else if block.type === 'video'}
					<VideoBlock {block} onupdate={(b: Block) => updateBlock(block.id, b)} />
				{:else if block.type === 'quote'}
					<QuoteBlock {block} onupdate={(b: Block) => updateBlock(block.id, b)} />
				{:else if block.type === 'pullquote'}
					<PullquoteBlock {block} onupdate={(b: Block) => updateBlock(block.id, b)} />
				{:else if block.type === 'code'}
					<CodeBlock {block} onupdate={(b: Block) => updateBlock(block.id, b)} />
				{:else if block.type === 'preformatted'}
					<PreformattedBlock {block} onupdate={(b: Block) => updateBlock(block.id, b)} />
				{:else if block.type === 'list'}
					<ListBlock {block} onupdate={(b: Block) => updateBlock(block.id, b)} />
				{:else if block.type === 'separator'}
					<SeparatorBlock {block} onupdate={(b: Block) => updateBlock(block.id, b)} />
				{:else if block.type === 'spacer'}
					<SpacerBlock {block} onupdate={(b: Block) => updateBlock(block.id, b)} />
				{:else if block.type === 'table'}
					<TableBlock {block} onupdate={(b: Block) => updateBlock(block.id, b)} />
				{:else if block.type === 'columns'}
					<ColumnsBlock {block} onupdate={(b: Block) => updateBlock(block.id, b)} />
				{:else if block.type === 'button'}
					<ButtonBlock {block} onupdate={(b: Block) => updateBlock(block.id, b)} />
				{:else if block.type === 'embed'}
					<EmbedBlock {block} onupdate={(b: Block) => updateBlock(block.id, b)} />
				{:else if block.type === 'html'}
					<HtmlBlock {block} onupdate={(b: Block) => updateBlock(block.id, b)} />
				{:else if block.type === 'shortcode'}
					<ShortcodeBlock {block} onupdate={(b: Block) => updateBlock(block.id, b)} />
				{/if}
			</div>

			<!-- Insert button between blocks -->
			<div class="sp-block-inserter-row">
				<button
					type="button"
					class="sp-block-insert-btn"
					title="Add block below"
					onclick={(e) => {
						e.stopPropagation();
						openInserter(index);
					}}
				>
					<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
						<path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
					</svg>
				</button>
			</div>
		</div>
	{/each}

	{#if blocks.length > 0}
		<div class="sp-block-append-row">
			<button
				type="button"
				class="sp-btn sp-btn-secondary sp-btn-sm"
				onclick={() => openInserter(blocks.length - 1)}
			>
				<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
					<path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
				</svg>
				Add block
			</button>
		</div>
	{/if}

	{#if showInserter}
		<BlockInserter
			onselect={(type) => insertBlock(type)}
			onclose={() => (showInserter = false)}
		/>
	{/if}
</div>

<!-- Click outside deselects block -->
<svelte:document onclick={() => { selectedId = null; }} />

<style>
	.sp-block-editor {
		position: relative;
		min-height: 300px;
	}

	.sp-block-editor-empty {
		display: flex;
		align-items: center;
		gap: 12px;
		justify-content: center;
		min-height: 200px;
		border: 2px dashed var(--sp-border);
		border-radius: 4px;
		background: #fafafa;
		color: var(--sp-text-muted);
		font-size: 14px;
	}

	.sp-block-wrapper {
		position: relative;
		margin-bottom: 2px;
		border-radius: 3px;
		border: 1px solid transparent;
		transition: border-color 0.15s;
		cursor: text;
	}

	.sp-block-wrapper:hover {
		border-color: var(--sp-border);
	}

	.sp-block-selected {
		border-color: var(--sp-primary) !important;
	}

	.sp-block-content {
		padding: 4px 8px;
	}

	.sp-block-inserter-row {
		display: flex;
		justify-content: center;
		height: 0;
		overflow: visible;
		position: relative;
		z-index: 5;
	}

	.sp-block-insert-btn {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 1px solid var(--sp-border);
		background: #fff;
		color: var(--sp-text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity 0.15s, border-color 0.15s;
		position: relative;
		top: -12px;
	}

	.sp-block-wrapper:hover .sp-block-insert-btn,
	.sp-block-selected .sp-block-insert-btn {
		opacity: 1;
	}

	.sp-block-insert-btn:hover {
		border-color: var(--sp-primary);
		color: var(--sp-primary);
	}

	.sp-block-append-row {
		display: flex;
		justify-content: center;
		padding: 12px 0;
	}
</style>
