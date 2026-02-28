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
		const ta = e.target as HTMLTextAreaElement;
		onupdate({ ...block, content: ta.value });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Tab') {
			e.preventDefault();
			const ta = e.target as HTMLTextAreaElement;
			const start = ta.selectionStart;
			const end = ta.selectionEnd;
			ta.value = ta.value.substring(0, start) + '\t' + ta.value.substring(end);
			ta.selectionStart = ta.selectionEnd = start + 1;
			onupdate({ ...block, content: ta.value });
		}
	}
</script>

<div class="sp-preformatted-block">
	<textarea
		class="sp-preformatted-textarea"
		value={block.content}
		oninput={handleInput}
		onkeydown={handleKeydown}
		placeholder="Preformatted text..."
		spellcheck={false}
		autocomplete="off"
		autocapitalize="off"
		onclick={(e) => e.stopPropagation()}
		rows={8}
	></textarea>
</div>

<style>
	.sp-preformatted-block {
		width: 100%;
		border: 1px solid var(--sp-border);
		border-radius: 4px;
		overflow: hidden;
	}

	.sp-preformatted-textarea {
		width: 100%;
		display: block;
		padding: 14px 16px;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 13px;
		line-height: 1.6;
		background: #f8f9fa;
		color: var(--sp-text);
		border: none;
		outline: none;
		resize: vertical;
		tab-size: 4;
		box-sizing: border-box;
		white-space: pre;
	}

	.sp-preformatted-textarea::placeholder {
		color: #c3c4c7;
	}
</style>
