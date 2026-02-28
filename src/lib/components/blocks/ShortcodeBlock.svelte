<script lang="ts">
	import type { Block } from '$lib/types/index.js';

	let {
		block,
		onupdate
	}: {
		block: Block;
		onupdate: (block: Block) => void;
	} = $props();

	function handleInput(e: Event) {
		const input = e.target as HTMLInputElement;
		onupdate({ ...block, content: input.value });
	}
</script>

<div class="sp-shortcode-block">
	<div class="sp-shortcode-icon" aria-hidden="true">[ ]</div>
	<input
		type="text"
		class="sp-shortcode-input"
		value={block.content}
		oninput={handleInput}
		placeholder="[shortcode attr=&quot;value&quot;]"
		spellcheck={false}
		onclick={(e) => e.stopPropagation()}
		aria-label="Shortcode"
	/>
</div>

<style>
	.sp-shortcode-block {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		border: 1px solid var(--sp-border);
		border-radius: 4px;
		background: #f8f9fa;
	}

	.sp-shortcode-icon {
		font-family: 'Consolas', 'Monaco', monospace;
		font-size: 16px;
		font-weight: 700;
		color: var(--sp-primary);
		flex-shrink: 0;
	}

	.sp-shortcode-input {
		flex: 1;
		border: none;
		background: transparent;
		outline: none;
		font-family: 'Consolas', 'Monaco', monospace;
		font-size: 14px;
		color: var(--sp-text);
	}

	.sp-shortcode-input::placeholder {
		color: #c3c4c7;
	}
</style>
