<script lang="ts">
	import type { Block } from '$lib/types/index.js';

	let {
		block,
		onupdate
	}: {
		block: Block;
		onupdate: (block: Block) => void;
	} = $props();

	let ordered = $derived(Boolean(block.attrs.ordered ?? false));
	let items = $derived((block.attrs.items as string[]) ?? ['']);

	let itemRefs = $state<(HTMLLIElement | null)[]>([]);

	function setOrdered(val: boolean) {
		onupdate({ ...block, attrs: { ...block.attrs, ordered: val } });
	}

	function updateItem(index: number, value: string) {
		const next = [...items];
		next[index] = value;
		onupdate({ ...block, attrs: { ...block.attrs, items: next } });
	}

	function addItemAfter(index: number) {
		const next = [...items];
		next.splice(index + 1, 0, '');
		onupdate({ ...block, attrs: { ...block.attrs, items: next } });
		// Focus new item after state update
		setTimeout(() => {
			itemRefs[index + 1]?.focus();
		}, 0);
	}

	function removeItem(index: number) {
		if (items.length <= 1) return;
		const next = [...items];
		next.splice(index, 1);
		onupdate({ ...block, attrs: { ...block.attrs, items: next } });
		setTimeout(() => {
			const focusIdx = Math.max(0, index - 1);
			itemRefs[focusIdx]?.focus();
		}, 0);
	}

	function handleKeydown(e: KeyboardEvent, index: number) {
		e.stopPropagation();
		if (e.key === 'Enter') {
			e.preventDefault();
			addItemAfter(index);
		} else if (e.key === 'Backspace') {
			const li = e.target as HTMLLIElement;
			if (li.textContent === '' || li.innerHTML === '') {
				e.preventDefault();
				removeItem(index);
			}
		}
	}

	function handleItemInput(e: Event, index: number) {
		const li = e.target as HTMLLIElement;
		updateItem(index, li.textContent ?? '');
	}
</script>

<div class="sp-list-block">
	<div class="sp-list-toolbar">
		<button
			type="button"
			class="sp-list-type-btn"
			class:active={!ordered}
			onclick={(e) => { e.stopPropagation(); setOrdered(false); }}
			title="Unordered list"
			aria-label="Unordered list"
		>
			<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
				<circle cx="2" cy="4" r="1.2"/>
				<path d="M5 4h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				<circle cx="2" cy="8" r="1.2"/>
				<path d="M5 8h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				<circle cx="2" cy="12" r="1.2"/>
				<path d="M5 12h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
			</svg>
		</button>
		<button
			type="button"
			class="sp-list-type-btn"
			class:active={ordered}
			onclick={(e) => { e.stopPropagation(); setOrdered(true); }}
			title="Ordered list"
			aria-label="Ordered list"
		>
			<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
				<text x="0" y="5" font-size="5" fill="currentColor">1.</text>
				<path d="M5 4h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				<text x="0" y="9" font-size="5" fill="currentColor">2.</text>
				<path d="M5 8h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				<text x="0" y="13" font-size="5" fill="currentColor">3.</text>
				<path d="M5 12h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
			</svg>
		</button>
	</div>

	{#if ordered}
		<ol class="sp-list-editable">
			{#each items as item, i}
				<li
					bind:this={itemRefs[i]}
					contenteditable="true"
					class="sp-list-item"
					data-placeholder="List item..."
					oninput={(e) => handleItemInput(e, i)}
					onkeydown={(e) => handleKeydown(e, i)}
					role="textbox"
					aria-multiline="false"
					aria-label="List item {i + 1}"
				>{item}</li>
			{/each}
		</ol>
	{:else}
		<ul class="sp-list-editable">
			{#each items as item, i}
				<li
					bind:this={itemRefs[i]}
					contenteditable="true"
					class="sp-list-item"
					data-placeholder="List item..."
					oninput={(e) => handleItemInput(e, i)}
					onkeydown={(e) => handleKeydown(e, i)}
					role="textbox"
					aria-multiline="false"
					aria-label="List item {i + 1}"
				>{item}</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.sp-list-block {
		width: 100%;
	}

	.sp-list-toolbar {
		display: flex;
		gap: 4px;
		margin-bottom: 8px;
	}

	.sp-list-type-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: 1px solid var(--sp-border);
		border-radius: 3px;
		background: #fff;
		color: var(--sp-text-muted);
		cursor: pointer;
		transition: background-color 0.1s, color 0.1s;
	}

	.sp-list-type-btn:hover,
	.sp-list-type-btn.active {
		background: var(--sp-primary);
		border-color: var(--sp-primary);
		color: #fff;
	}

	.sp-list-editable {
		margin: 0;
		padding-left: 1.5em;
	}

	.sp-list-item {
		outline: none;
		font-size: 16px;
		line-height: 1.7;
		color: var(--sp-text);
		word-break: break-word;
		min-height: 1.6em;
		padding: 2px 0;
	}

	.sp-list-item:empty::before {
		content: attr(data-placeholder);
		color: #c3c4c7;
		pointer-events: none;
	}
</style>
