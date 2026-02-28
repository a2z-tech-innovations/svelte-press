<script lang="ts">
	import type { Block } from '$lib/types/index.js';

	let {
		block,
		onupdate
	}: {
		block: Block;
		onupdate: (block: Block) => void;
	} = $props();

	let height = $derived(Number(block.attrs.height ?? 40));
	let dragging = $state(false);
	let startY = $state(0);
	let startH = $state(0);

	function onMouseDown(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragging = true;
		startY = e.clientY;
		startH = height;
	}

	function onMouseMove(e: MouseEvent) {
		if (!dragging) return;
		const delta = e.clientY - startY;
		const newH = Math.max(20, Math.min(400, startH + delta));
		onupdate({ ...block, attrs: { ...block.attrs, height: Math.round(newH) } });
	}

	function onMouseUp() {
		dragging = false;
	}
</script>

<svelte:document onmousemove={onMouseMove} onmouseup={onMouseUp} />

<div
	class="sp-spacer-block"
	style="height:{height}px"
	onclick={(e) => e.stopPropagation()}
>
	<span class="sp-spacer-label">{height}px</span>
	<div
		class="sp-spacer-handle"
		onmousedown={onMouseDown}
		title="Drag to resize"
		role="slider"
		aria-label="Spacer height"
		aria-valuenow={height}
		aria-valuemin={20}
		aria-valuemax={400}
	>
		<svg width="14" height="6" viewBox="0 0 14 6" fill="currentColor" aria-hidden="true">
			<path d="M1 2h12M1 5h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
		</svg>
	</div>
</div>

<style>
	.sp-spacer-block {
		width: 100%;
		position: relative;
		background: repeating-linear-gradient(
			0deg,
			transparent,
			transparent 9px,
			rgba(0, 0, 0, 0.04) 9px,
			rgba(0, 0, 0, 0.04) 10px
		);
		border: 1px dashed var(--sp-border);
		border-radius: 3px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 20px;
	}

	.sp-spacer-label {
		font-size: 11px;
		color: var(--sp-text-muted);
		background: rgba(255, 255, 255, 0.8);
		padding: 2px 6px;
		border-radius: 3px;
	}

	.sp-spacer-handle {
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 32px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: ns-resize;
		background: #fff;
		border: 1px solid var(--sp-border);
		border-radius: 3px 3px 0 0;
		color: var(--sp-text-muted);
		transition: border-color 0.1s;
	}

	.sp-spacer-handle:hover {
		border-color: var(--sp-primary);
		color: var(--sp-primary);
	}
</style>
