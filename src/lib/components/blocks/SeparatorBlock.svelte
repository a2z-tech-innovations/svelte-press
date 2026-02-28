<script lang="ts">
	import type { Block } from '$lib/types/index.js';

	let {
		block,
		onupdate
	}: {
		block: Block;
		onupdate: (block: Block) => void;
	} = $props();

	let style = $derived(String(block.attrs.style ?? 'default') as 'default' | 'wide' | 'dots');

	function setStyle(s: string) {
		onupdate({ ...block, attrs: { ...block.attrs, style: s } });
	}
</script>

<div class="sp-separator-block">
	<div class="sp-separator-controls" onclick={(e) => e.stopPropagation()}>
		{#each ['default', 'wide', 'dots'] as s}
			<button
				type="button"
				class="sp-separator-style-btn"
				class:active={style === s}
				onclick={(e) => { e.stopPropagation(); setStyle(s); }}
			>{s}</button>
		{/each}
	</div>
	{#if style === 'dots'}
		<div class="sp-separator-dots" aria-hidden="true">
			<span></span><span></span><span></span>
		</div>
	{:else}
		<hr
			class="sp-separator-hr"
			class:sp-separator-wide={style === 'wide'}
			aria-hidden="true"
		/>
	{/if}
</div>

<style>
	.sp-separator-block {
		width: 100%;
		padding: 8px 0;
	}

	.sp-separator-controls {
		display: flex;
		gap: 4px;
		margin-bottom: 8px;
	}

	.sp-separator-style-btn {
		padding: 2px 8px;
		font-size: 11px;
		border: 1px solid var(--sp-border);
		border-radius: 3px;
		background: #fff;
		color: var(--sp-text-muted);
		cursor: pointer;
		text-transform: capitalize;
		transition: background-color 0.1s, color 0.1s;
	}

	.sp-separator-style-btn:hover,
	.sp-separator-style-btn.active {
		background: var(--sp-primary);
		border-color: var(--sp-primary);
		color: #fff;
	}

	.sp-separator-hr {
		border: none;
		border-top: 2px solid var(--sp-border);
		margin: 0 auto;
		width: 100px;
	}

	.sp-separator-wide {
		width: 100%;
	}

	.sp-separator-dots {
		display: flex;
		justify-content: center;
		gap: 8px;
		padding: 8px 0;
	}

	.sp-separator-dots span {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--sp-border);
		display: block;
	}
</style>
