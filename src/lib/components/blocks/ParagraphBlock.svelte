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

	// localContent only updates when switching to a DIFFERENT block (id changes).
	// While the user is typing in the SAME block, localContent stays put so
	// {@html localContent} does not reset the contenteditable DOM.
	let localContent = $state(block.content ?? '');
	let prevId = $state(block.id);

	$effect(() => {
		const id = block.id; // tracked dependency
		if (id !== prevId) {
			prevId = id;
			localContent = untrack(() => block.content ?? '');
		}
	});

	function handleInput(e: Event) {
		const target = e.target as HTMLDivElement;
		onupdate({ ...block, content: target.innerHTML });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			document.execCommand('bold');
		}
		if (e.key === 'i' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			document.execCommand('italic');
		}
	}
</script>

<div class="sp-paragraph-block">
	<!-- Admin-authored content only — no untrusted user input reaches this innerHTML -->
	<div
		contenteditable="true"
		class="sp-paragraph-editable"
		data-placeholder="Type to write..."
		oninput={handleInput}
		onkeydown={handleKeydown}
		role="textbox"
		aria-multiline="true"
		aria-label="Paragraph block"
	>{@html localContent}</div>
</div>

<style>
	.sp-paragraph-block {
		width: 100%;
	}

	.sp-paragraph-editable {
		min-height: 1.6em;
		outline: none;
		font-size: 16px;
		line-height: 1.7;
		color: var(--sp-text);
		word-break: break-word;
	}

	.sp-paragraph-editable:empty::before {
		content: attr(data-placeholder);
		color: #c3c4c7;
		pointer-events: none;
	}
</style>
