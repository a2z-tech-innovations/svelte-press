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

	let citation = $derived(String(block.attrs.citation ?? ''));

	$effect(() => {
		const id = block.id;
		if (id !== prevId) {
			prevId = id;
			localContent = untrack(() => block.content ?? '');
		}
	});

	function handleInput(e: Event) {
		const target = e.target as HTMLElement;
		onupdate({ ...block, content: target.innerHTML });
	}

	function updateCitation(value: string) {
		onupdate({ ...block, attrs: { ...block.attrs, citation: value } });
	}
</script>

<div class="sp-quote-block">
	<blockquote class="sp-blockquote">
		<div
			contenteditable="true"
			class="sp-quote-editable"
			data-placeholder="Write a quote..."
			oninput={handleInput}
			role="textbox"
			aria-multiline="true"
			aria-label="Quote text"
		>{@html localContent}</div>
	</blockquote>
	<cite class="sp-quote-cite">
		<input
			type="text"
			class="sp-quote-cite-input"
			placeholder="— Citation (optional)"
			value={citation}
			oninput={(e) => updateCitation((e.target as HTMLInputElement).value)}
			onclick={(e) => e.stopPropagation()}
		/>
	</cite>
</div>

<style>
	.sp-quote-block {
		width: 100%;
	}

	.sp-blockquote {
		border-left: 4px solid var(--sp-primary);
		margin: 0;
		padding: 12px 16px;
		background: #f8fafc;
		border-radius: 0 4px 4px 0;
	}

	.sp-quote-editable {
		outline: none;
		font-size: 16px;
		line-height: 1.7;
		font-style: italic;
		color: var(--sp-text);
		word-break: break-word;
		min-height: 1.6em;
	}

	.sp-quote-editable:empty::before {
		content: attr(data-placeholder);
		color: #c3c4c7;
		pointer-events: none;
		font-style: normal;
	}

	.sp-quote-cite {
		display: block;
		margin-top: 6px;
	}

	.sp-quote-cite-input {
		width: 100%;
		border: none;
		border-bottom: 1px solid var(--sp-border);
		outline: none;
		font-size: 13px;
		color: var(--sp-text-muted);
		padding: 4px 0;
		background: transparent;
		font-style: normal;
	}

	.sp-quote-cite-input::placeholder {
		color: #c3c4c7;
	}
</style>
