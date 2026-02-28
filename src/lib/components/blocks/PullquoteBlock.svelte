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

	let localContent = $state((block.content ?? '').replace(/<!--[\s\S]*?-->/g, ''));
	let prevId = $state(block.id);

	let citation = $derived(String(block.attrs.citation ?? ''));

	$effect(() => {
		const id = block.id;
		if (id !== prevId) {
			prevId = id;
			localContent = untrack(() => (block.content ?? '').replace(/<!--[\s\S]*?-->/g, ''));
		}
	});

	function handleInput(e: Event) {
		const target = e.target as HTMLElement;
		const clean = target.innerHTML.replace(/<!--[\s\S]*?-->/g, '');
		onupdate({ ...block, content: clean });
	}
</script>

<div class="sp-pullquote-block">
	<blockquote class="sp-pullquote">
		<div
			contenteditable="true"
			class="sp-pullquote-editable"
			data-placeholder="Write a quote..."
			oninput={handleInput}
			role="textbox"
			aria-multiline="true"
			aria-label="Pullquote text"
		>{@html localContent}</div>
		<cite class="sp-pullquote-cite">
			<input
				type="text"
				class="sp-pullquote-cite-input"
				placeholder="— Citation (optional)"
				value={citation}
				oninput={(e) => onupdate({ ...block, attrs: { ...block.attrs, citation: (e.target as HTMLInputElement).value } })}
				onclick={(e) => e.stopPropagation()}
			/>
		</cite>
	</blockquote>
</div>

<style>
	.sp-pullquote-block {
		width: 100%;
	}

	.sp-pullquote {
		margin: 0;
		padding: 24px 32px;
		text-align: center;
		border-top: 4px solid var(--sp-text);
		border-bottom: 4px solid var(--sp-text);
	}

	.sp-pullquote-editable {
		outline: none;
		font-size: 22px;
		font-weight: 600;
		line-height: 1.5;
		color: var(--sp-text);
		font-style: italic;
		word-break: break-word;
		min-height: 1.5em;
	}

	.sp-pullquote-editable:empty::before {
		content: attr(data-placeholder);
		color: #c3c4c7;
		pointer-events: none;
		font-style: normal;
		font-weight: 400;
	}

	.sp-pullquote-cite {
		display: block;
		margin-top: 12px;
	}

	.sp-pullquote-cite-input {
		border: none;
		border-bottom: 1px solid var(--sp-border);
		outline: none;
		font-size: 13px;
		color: var(--sp-text-muted);
		padding: 4px 0;
		background: transparent;
		text-align: center;
		width: 100%;
		max-width: 300px;
	}

	.sp-pullquote-cite-input::placeholder {
		color: #c3c4c7;
	}
</style>
