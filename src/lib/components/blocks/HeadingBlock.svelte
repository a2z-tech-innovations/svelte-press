<script lang="ts">
	import { untrack } from 'svelte';
	import type { Block } from '$lib/types/index.js';

	let {
		block,
		onupdate
	}: {
		block: Block;
		onupdate: (block: Block) => void;
	} = $props();

	let localContent = $state(block.content ?? '');
	let prevId = $state(block.id);

	$effect(() => {
		if (block.id !== untrack(() => prevId)) {
			prevId = block.id;
			localContent = block.content ?? '';
		}
	});

	let level = $derived(Number(block.attrs.level ?? 2) as 1 | 2 | 3 | 4 | 5 | 6);

	function setLevel(l: number) {
		onupdate({ ...block, attrs: { ...block.attrs, level: l } });
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLElement;
		onupdate({ ...block, content: target.innerHTML });
	}

	const fontSizes: Record<number, string> = {
		1: '2rem',
		2: '1.5rem',
		3: '1.25rem',
		4: '1.1rem',
		5: '1rem',
		6: '0.9rem'
	};
</script>

<div class="sp-heading-block">
	<div class="sp-heading-level-bar">
		{#each [1, 2, 3, 4, 5, 6] as l}
			<button
				type="button"
				class="sp-heading-level-btn"
				class:active={level === l}
				onclick={(e) => { e.stopPropagation(); setLevel(l); }}
				aria-label="Heading {l}"
			>H{l}</button>
		{/each}
	</div>

	{#if level === 1}
		<h1
			contenteditable="true"
			class="sp-heading-editable"
			data-placeholder="Heading..."
			style="font-size:{fontSizes[1]}"
			oninput={handleInput}
			role="textbox"
			aria-multiline="false"
			aria-label="Heading 1"
		>{@html localContent}</h1>
	{:else if level === 2}
		<h2
			contenteditable="true"
			class="sp-heading-editable"
			data-placeholder="Heading..."
			style="font-size:{fontSizes[2]}"
			oninput={handleInput}
			role="textbox"
			aria-multiline="false"
			aria-label="Heading 2"
		>{@html localContent}</h2>
	{:else if level === 3}
		<h3
			contenteditable="true"
			class="sp-heading-editable"
			data-placeholder="Heading..."
			style="font-size:{fontSizes[3]}"
			oninput={handleInput}
			role="textbox"
			aria-multiline="false"
			aria-label="Heading 3"
		>{@html localContent}</h3>
	{:else if level === 4}
		<h4
			contenteditable="true"
			class="sp-heading-editable"
			data-placeholder="Heading..."
			style="font-size:{fontSizes[4]}"
			oninput={handleInput}
			role="textbox"
			aria-multiline="false"
			aria-label="Heading 4"
		>{@html localContent}</h4>
	{:else if level === 5}
		<h5
			contenteditable="true"
			class="sp-heading-editable"
			data-placeholder="Heading..."
			style="font-size:{fontSizes[5]}"
			oninput={handleInput}
			role="textbox"
			aria-multiline="false"
			aria-label="Heading 5"
		>{@html localContent}</h5>
	{:else}
		<h6
			contenteditable="true"
			class="sp-heading-editable"
			data-placeholder="Heading..."
			style="font-size:{fontSizes[6]}"
			oninput={handleInput}
			role="textbox"
			aria-multiline="false"
			aria-label="Heading 6"
		>{@html localContent}</h6>
	{/if}
</div>

<style>
	.sp-heading-block {
		width: 100%;
	}

	.sp-heading-level-bar {
		display: flex;
		gap: 2px;
		margin-bottom: 6px;
	}

	.sp-heading-level-btn {
		padding: 2px 7px;
		font-size: 11px;
		font-weight: 700;
		border: 1px solid var(--sp-border);
		border-radius: 3px;
		background: #fff;
		color: var(--sp-text-muted);
		cursor: pointer;
		transition: background-color 0.1s, color 0.1s, border-color 0.1s;
	}

	.sp-heading-level-btn:hover,
	.sp-heading-level-btn.active {
		background: var(--sp-primary);
		color: #fff;
		border-color: var(--sp-primary);
	}

	.sp-heading-editable {
		outline: none;
		font-weight: 700;
		line-height: 1.3;
		color: var(--sp-text);
		margin: 0;
		padding: 2px 0;
		word-break: break-word;
	}

	.sp-heading-editable:empty::before {
		content: attr(data-placeholder);
		color: #c3c4c7;
		pointer-events: none;
		font-weight: 400;
	}
</style>
