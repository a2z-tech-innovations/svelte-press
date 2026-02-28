<script lang="ts">
	import type { Block } from '$lib/types/index.js';

	let {
		block,
		onupdate
	}: {
		block: Block;
		onupdate: (block: Block) => void;
	} = $props();
</script>

<div class="sp-gallery-block">
	<div class="sp-gallery-placeholder">
		<svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
			<rect x="1" y="1" width="15" height="15" rx="2" stroke="currentColor" stroke-width="1.5"/>
			<rect x="20" y="1" width="15" height="15" rx="2" stroke="currentColor" stroke-width="1.5"/>
			<rect x="1" y="20" width="15" height="15" rx="2" stroke="currentColor" stroke-width="1.5"/>
			<rect x="20" y="20" width="15" height="15" rx="2" stroke="currentColor" stroke-width="1.5"/>
		</svg>
		<p>Gallery block: upload multiple images (coming soon)</p>
	</div>
</div>

<style>
	.sp-gallery-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 28px;
		border: 2px dashed var(--sp-border);
		border-radius: 4px;
		background: #fafafa;
		color: var(--sp-text-muted);
		font-size: 13px;
		text-align: center;
	}
</style>
