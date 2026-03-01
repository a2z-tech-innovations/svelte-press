<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import type { GalleryImage } from '$lib/editor/extensions/Gallery.js';

	let { editor }: { editor: Editor } = $props();

	let open = $state(false);
	let search = $state('');

	interface BlockDef {
		name: string;
		label: string;
		category: string;
		icon: string;
		insert: () => void;
	}

	// Helper: insert content after the current selection end (avoids replacing selected atom nodes)
	function ins(content: Parameters<typeof editor.commands.insertContentAt>[1]) {
		const pos = editor.state.selection.to;
		editor.chain().focus().insertContentAt(pos, content).run();
	}

	const blockDefs: BlockDef[] = [
		// Text
		{
			name: 'paragraph', label: 'Paragraph', category: 'Text', icon: '¶',
			insert: () => editor.chain().focus().setParagraph().run()
		},
		{
			name: 'heading2', label: 'Heading 2', category: 'Text', icon: 'H2',
			insert: () => editor.chain().focus().setHeading({ level: 2 }).run()
		},
		{
			name: 'heading3', label: 'Heading 3', category: 'Text', icon: 'H3',
			insert: () => editor.chain().focus().setHeading({ level: 3 }).run()
		},
		{
			name: 'heading4', label: 'Heading 4', category: 'Text', icon: 'H4',
			insert: () => editor.chain().focus().setHeading({ level: 4 }).run()
		},
		{
			name: 'quote', label: 'Quote', category: 'Text', icon: '"',
			insert: () => editor.chain().focus().setBlockquote().run()
		},
		{
			name: 'pullquote', label: 'Pullquote', category: 'Text', icon: '❝',
			insert: () => ins({ type: 'pullquote' })
		},
		{
			name: 'preformatted', label: 'Preformatted', category: 'Text', icon: '</>',
			insert: () => ins({ type: 'preformatted', content: [{ type: 'text', text: ' ' }] })
		},
		{
			name: 'code', label: 'Code Block', category: 'Text', icon: '{ }',
			insert: () => editor.chain().focus().toggleCodeBlock().run()
		},
		// Lists
		{
			name: 'bulletList', label: 'Bullet List', category: 'Lists', icon: '•',
			insert: () => editor.chain().focus().toggleBulletList().run()
		},
		{
			name: 'orderedList', label: 'Numbered List', category: 'Lists', icon: '1.',
			insert: () => editor.chain().focus().toggleOrderedList().run()
		},
		// Media
		{
			name: 'image', label: 'Image', category: 'Media', icon: '🖼',
			insert: () => ins({ type: 'image', attrs: { src: '', alt: '' } })
		},
		{
			name: 'gallery', label: 'Gallery', category: 'Media', icon: '▦',
			insert: () => ins({ type: 'gallery', attrs: { images: [] as GalleryImage[] } })
		},
		{
			name: 'video', label: 'Video', category: 'Media', icon: '▶',
			insert: () => ins({ type: 'video', attrs: { url: '', caption: '' } })
		},
		{
			name: 'embed', label: 'Embed', category: 'Media', icon: '◈',
			insert: () => ins({ type: 'embed', attrs: { url: '', caption: '', embedHtml: '' } })
		},
		// Layout
		{
			name: 'columns', label: 'Two Columns', category: 'Layout', icon: '▥',
			insert: () => ins({
				type: 'columns',
				content: [
					{ type: 'column', content: [{ type: 'paragraph' }] },
					{ type: 'column', content: [{ type: 'paragraph' }] }
				]
			})
		},
		{
			name: 'separator', label: 'Separator', category: 'Layout', icon: '—',
			insert: () => editor.chain().focus().setHorizontalRule().run()
		},
		{
			name: 'spacer', label: 'Spacer', category: 'Layout', icon: '↕',
			insert: () => ins({ type: 'spacer', attrs: { height: 40 } })
		},
		// Advanced
		{
			name: 'button', label: 'Button', category: 'Advanced', icon: '[→]',
			insert: () => ins({
				type: 'button',
				attrs: { url: '', target: '_self', style: 'fill' },
				content: [{ type: 'text', text: 'Click here' }]
			})
		},
		{
			name: 'html', label: 'Custom HTML', category: 'Advanced', icon: '</>',
			insert: () => ins({ type: 'html', attrs: { rawHtml: '' } })
		},
		{
			name: 'shortcode', label: 'Shortcode', category: 'Advanced', icon: '[ ]',
			insert: () => ins({ type: 'shortcode', attrs: { code: '' } })
		},
		{
			name: 'table', label: 'Table', category: 'Advanced', icon: '▤',
			insert: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
		}
	];

	let filtered = $derived(
		search.trim()
			? blockDefs.filter((b) => b.label.toLowerCase().includes(search.toLowerCase()))
			: blockDefs
	);

	let categories = $derived([...new Set(filtered.map((b) => b.category))]);

	function insertBlock(def: BlockDef) {
		def.insert();
		open = false;
		search = '';
	}

	// Close on Escape
	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			open = false;
			search = '';
		}
	}
</script>

<svelte:window onkeydown={open ? onKeydown : undefined} />

<div class="sp-inserter-wrap">
	<button
		type="button"
		class="sp-inserter-toggle"
		title="Add block"
		onclick={() => (open = !open)}
		aria-label="Add block"
		aria-expanded={open}
	>
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
			<path d="M7 1v12M1 7h12"/>
		</svg>
	</button>

	{#if open}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="sp-inserter-backdrop" onclick={() => { open = false; search = ''; }}></div>
		<div class="sp-inserter-menu" role="dialog" aria-label="Insert block">
			<div class="sp-inserter-search">
				<input
					type="text"
					placeholder="Search blocks…"
					bind:value={search}
					class="sp-input"
					style="width:100%;"
					autofocus
				/>
			</div>
			<div class="sp-inserter-list">
				{#each categories as cat}
					<div class="sp-inserter-category">{cat}</div>
					{#each filtered.filter((b) => b.category === cat) as block}
						<button
							type="button"
							class="sp-inserter-item"
							onclick={() => insertBlock(block)}
						>
							<span class="sp-inserter-icon">{block.icon}</span>
							<span class="sp-inserter-label">{block.label}</span>
						</button>
					{/each}
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.sp-inserter-wrap {
		position: relative;
		display: inline-flex;
	}

	.sp-inserter-toggle {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 1px solid var(--sp-border, #c3c4c7);
		background: #fff;
		color: var(--sp-text-muted, #646970);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: border-color 0.15s, color 0.15s;
	}

	.sp-inserter-toggle:hover {
		border-color: var(--sp-primary, #2271b1);
		color: var(--sp-primary, #2271b1);
	}

	.sp-inserter-backdrop {
		position: fixed;
		inset: 0;
		z-index: 99;
	}

	.sp-inserter-menu {
		position: absolute;
		top: calc(100% + 8px);
		left: 0;
		width: 240px;
		max-height: 400px;
		background: #fff;
		border: 1px solid var(--sp-border, #c3c4c7);
		border-radius: 6px;
		box-shadow: 0 4px 16px rgba(0,0,0,0.12);
		z-index: 100;
		display: flex;
		flex-direction: column;
	}

	.sp-inserter-search {
		padding: 10px;
		border-bottom: 1px solid var(--sp-border, #c3c4c7);
	}

	.sp-inserter-list {
		overflow-y: auto;
		padding: 6px;
		flex: 1;
	}

	.sp-inserter-category {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--sp-text-muted, #646970);
		padding: 8px 8px 4px;
	}

	.sp-inserter-item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 7px 8px;
		border: none;
		background: transparent;
		cursor: pointer;
		border-radius: 4px;
		text-align: left;
		font-family: inherit;
		font-size: 13px;
		color: var(--sp-text, #1d2327);
	}

	.sp-inserter-item:hover {
		background: var(--sp-content-bg, #f0f0f1);
	}

	.sp-inserter-icon {
		width: 28px;
		height: 28px;
		background: #f6f7f7;
		border: 1px solid var(--sp-border, #c3c4c7);
		border-radius: 3px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		font-weight: 600;
		color: var(--sp-text-muted, #646970);
		flex-shrink: 0;
		font-family: monospace;
	}

	.sp-inserter-label {
		flex: 1;
	}
</style>
