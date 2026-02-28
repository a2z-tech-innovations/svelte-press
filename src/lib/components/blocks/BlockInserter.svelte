<script lang="ts">
	let {
		onselect,
		onclose
	}: {
		onselect: (type: string) => void;
		onclose: () => void;
	} = $props();

	type BlockDef = { type: string; label: string; icon: string };
	type Category = { label: string; blocks: BlockDef[] };

	const categories: Category[] = [
		{
			label: 'Text',
			blocks: [
				{
					type: 'paragraph',
					label: 'Paragraph',
					icon: '<path d="M3 4h10M3 7h10M3 10h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>'
				},
				{
					type: 'heading',
					label: 'Heading',
					icon: '<text x="2" y="12" font-size="11" font-weight="700" fill="currentColor" font-family="serif">H</text><path d="M8 4v8M8 8h6M14 4v8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/>'
				},
				{
					type: 'list',
					label: 'List',
					icon: '<circle cx="3" cy="5" r="1" fill="currentColor"/><path d="M6 5h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="3" cy="9" r="1" fill="currentColor"/><path d="M6 9h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="3" cy="13" r="1" fill="currentColor"/><path d="M6 13h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'
				},
				{
					type: 'quote',
					label: 'Quote',
					icon: '<path d="M3 5c0 2 1.5 3 3 3v4H3V5zm7 0c0 2 1.5 3 3 3v4h-3V5z" fill="currentColor" opacity="0.7"/>'
				},
				{
					type: 'pullquote',
					label: 'Pullquote',
					icon: '<path d="M1 3h14M1 13h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M4 6c0 1.5 1 2.5 2.5 2.5V11H4V6zm5.5 0c0 1.5 1 2.5 2.5 2.5V11H9.5V6z" fill="currentColor" opacity="0.7"/>'
				},
				{
					type: 'code',
					label: 'Code',
					icon: '<path d="M5 4L2 8l3 4M11 4l3 4-3 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M9 3l-2 10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity="0.6"/>'
				},
				{
					type: 'preformatted',
					label: 'Preformatted',
					icon: '<rect x="1" y="2" width="14" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M4 6h8M4 9h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity="0.7"/>'
				},
				{
					type: 'html',
					label: 'HTML',
					icon: '<path d="M4 4L1 8l3 4M12 4l3 4-3 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M7 4l2 8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity="0.6"/>'
				},
				{
					type: 'shortcode',
					label: 'Shortcode',
					icon: '<rect x="1" y="4" width="14" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M5 8h6M8 6v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity="0.8"/>'
				}
			]
		},
		{
			label: 'Media',
			blocks: [
				{
					type: 'image',
					label: 'Image',
					icon: '<rect x="1" y="2" width="14" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="5.5" cy="6" r="1.5" fill="currentColor" opacity="0.7"/><path d="M1 11l4-4 3 3 2-2 4 4" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
				},
				{
					type: 'gallery',
					label: 'Gallery',
					icon: '<rect x="1" y="1" width="6" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="1" width="6" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="1" y="9" width="6" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="9" width="6" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/>'
				},
				{
					type: 'video',
					label: 'Video',
					icon: '<rect x="1" y="3" width="14" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M6 6l5 2.5-5 2.5V6z" fill="currentColor" opacity="0.7"/>'
				}
			]
		},
		{
			label: 'Layout',
			blocks: [
				{
					type: 'columns',
					label: 'Columns',
					icon: '<rect x="1" y="2" width="6" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="2" width="6" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/>'
				},
				{
					type: 'separator',
					label: 'Separator',
					icon: '<path d="M1 8h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
				},
				{
					type: 'spacer',
					label: 'Spacer',
					icon: '<path d="M8 3v10M4 3h8M4 13h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'
				},
				{
					type: 'table',
					label: 'Table',
					icon: '<rect x="1" y="1" width="14" height="14" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M1 5h14M1 9h14M8 1v14" stroke="currentColor" stroke-width="1" opacity="0.7"/>'
				}
			]
		},
		{
			label: 'Widgets',
			blocks: [
				{
					type: 'button',
					label: 'Button',
					icon: '<rect x="1" y="4" width="14" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M5 8h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'
				},
				{
					type: 'embed',
					label: 'Embed',
					icon: '<rect x="1" y="2" width="14" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M5 6l-2 2 2 2M11 6l2 2-2 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>'
				}
			]
		}
	];

	let search = $state('');

	let filtered = $derived(
		search.trim()
			? categories
					.map((cat) => ({
						...cat,
						blocks: cat.blocks.filter(
							(b) =>
								b.label.toLowerCase().includes(search.toLowerCase()) ||
								b.type.toLowerCase().includes(search.toLowerCase())
						)
					}))
					.filter((cat) => cat.blocks.length > 0)
			: categories
	);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop -->
<div
	class="sp-inserter-backdrop"
	onclick={(e) => { e.stopPropagation(); onclose(); }}
	role="presentation"
></div>

<div class="sp-inserter" role="dialog" aria-label="Choose block type">
	<div class="sp-inserter-header">
		<span class="sp-inserter-title">Add Block</span>
		<button type="button" class="sp-inserter-close" onclick={onclose} aria-label="Close">
			<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
				<path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
			</svg>
		</button>
	</div>

	<div class="sp-inserter-search">
		<input
			type="search"
			class="sp-input"
			placeholder="Search blocks..."
			bind:value={search}
			autofocus
		/>
	</div>

	<div class="sp-inserter-body">
		{#each filtered as category}
			<div class="sp-inserter-category">
				<div class="sp-inserter-category-label">{category.label}</div>
				<div class="sp-inserter-grid">
					{#each category.blocks as blockDef}
						<button
							type="button"
							class="sp-inserter-block-btn"
							onclick={(e) => { e.stopPropagation(); onselect(blockDef.type); }}
							title={blockDef.label}
						>
							<svg
								width="32"
								height="32"
								viewBox="0 0 16 16"
								fill="none"
								class="sp-inserter-icon"
								aria-hidden="true"
							>
								{@html blockDef.icon}
							</svg>
							<span class="sp-inserter-block-label">{blockDef.label}</span>
						</button>
					{/each}
				</div>
			</div>
		{/each}

		{#if filtered.length === 0}
			<div class="sp-inserter-empty">No blocks found for "{search}"</div>
		{/if}
	</div>
</div>

<style>
	.sp-inserter-backdrop {
		position: fixed;
		inset: 0;
		z-index: 999;
	}

	.sp-inserter {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 480px;
		max-width: 95vw;
		max-height: 80vh;
		background: #fff;
		border: 1px solid var(--sp-border);
		border-radius: 6px;
		box-shadow: 0 8px 40px rgba(0, 0, 0, 0.2);
		z-index: 1000;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.sp-inserter-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px 10px;
		border-bottom: 1px solid var(--sp-border);
	}

	.sp-inserter-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--sp-text);
	}

	.sp-inserter-close {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--sp-text-muted);
		padding: 2px;
		display: flex;
		align-items: center;
		border-radius: 3px;
		transition: color 0.15s;
	}

	.sp-inserter-close:hover {
		color: var(--sp-text);
	}

	.sp-inserter-search {
		padding: 10px 14px;
		border-bottom: 1px solid var(--sp-border);
	}

	.sp-inserter-body {
		overflow-y: auto;
		flex: 1;
		padding: 10px 0;
	}

	.sp-inserter-category {
		margin-bottom: 8px;
	}

	.sp-inserter-category-label {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--sp-text-muted);
		padding: 6px 16px 4px;
	}

	.sp-inserter-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
		gap: 4px;
		padding: 0 12px;
	}

	.sp-inserter-block-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 12px 8px 10px;
		border: 1px solid transparent;
		border-radius: 5px;
		background: none;
		cursor: pointer;
		transition: background-color 0.15s, border-color 0.15s;
		color: var(--sp-text);
	}

	.sp-inserter-block-btn:hover {
		background: #f0f0f1;
		border-color: var(--sp-border);
	}

	.sp-inserter-block-btn:active {
		background: #e7e7e7;
	}

	.sp-inserter-icon {
		color: var(--sp-text-muted);
	}

	.sp-inserter-block-label {
		font-size: 11px;
		text-align: center;
		color: var(--sp-text);
		line-height: 1.3;
	}

	.sp-inserter-empty {
		padding: 24px;
		text-align: center;
		color: var(--sp-text-muted);
		font-size: 13px;
	}
</style>
