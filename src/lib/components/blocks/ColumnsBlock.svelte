<script lang="ts">
	import type { Block } from '$lib/types/index.js';

	let {
		block,
		onupdate
	}: {
		block: Block;
		onupdate: (block: Block) => void;
	} = $props();

	let columns = $derived(Number(block.attrs.columns ?? 2));
</script>

<div class="sp-columns-block" onclick={(e) => e.stopPropagation()}>
	<div class="sp-columns-toolbar">
		<span class="sp-columns-label">Columns:</span>
		{#each [2, 3, 4] as n}
			<button
				type="button"
				class="sp-columns-btn"
				class:active={columns === n}
				onclick={() => onupdate({ ...block, attrs: { ...block.attrs, columns: n } })}
			>{n}</button>
		{/each}
	</div>
	<div class="sp-columns-preview" style="grid-template-columns: repeat({columns}, 1fr)">
		{#each Array(columns) as _, i}
			<div class="sp-columns-col">
				<span class="sp-columns-placeholder">Column {i + 1}</span>
				<p class="sp-columns-note">Nested blocks coming soon</p>
			</div>
		{/each}
	</div>
</div>

<style>
	.sp-columns-block {
		width: 100%;
	}

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

	.sp-columns-preview {
		display: grid;
		gap: 12px;
	}

	.sp-columns-col {
		min-height: 80px;
		border: 2px dashed var(--sp-border);
		border-radius: 4px;
		padding: 16px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		background: #fafafa;
	}

	.sp-columns-placeholder {
		font-size: 13px;
		font-weight: 600;
		color: var(--sp-text-muted);
	}

	.sp-columns-note {
		font-size: 11px;
		color: #c3c4c7;
		margin: 0;
	}
</style>
