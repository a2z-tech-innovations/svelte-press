<script lang="ts">
	import type { Block } from '$lib/types/index.js';

	let {
		block,
		onupdate
	}: {
		block: Block;
		onupdate: (block: Block) => void;
	} = $props();

	let preview = $state(false);

	function handleInput(e: Event) {
		const ta = e.target as HTMLTextAreaElement;
		onupdate({ ...block, content: ta.value });
	}
</script>

<div class="sp-html-block">
	<div class="sp-html-toolbar" onclick={(e) => e.stopPropagation()}>
		<button
			type="button"
			class="sp-html-tab"
			class:active={!preview}
			onclick={() => (preview = false)}
		>HTML</button>
		<button
			type="button"
			class="sp-html-tab"
			class:active={preview}
			onclick={() => (preview = true)}
		>Preview</button>
	</div>

	{#if preview}
		<div class="sp-html-preview">
			{#if block.content.trim()}
				<!-- Note: Only admin-authored content is rendered here -->
				{@html block.content}
			{:else}
				<span class="sp-html-preview-empty">Nothing to preview</span>
			{/if}
		</div>
	{:else}
		<textarea
			class="sp-html-textarea"
			value={block.content}
			oninput={handleInput}
			placeholder="<p>Add HTML code...</p>"
			spellcheck={false}
			autocomplete="off"
			autocapitalize="off"
			onclick={(e) => e.stopPropagation()}
			rows={8}
		></textarea>
	{/if}
</div>

<style>
	.sp-html-block {
		width: 100%;
		border: 1px solid var(--sp-border);
		border-radius: 4px;
		overflow: hidden;
	}

	.sp-html-toolbar {
		display: flex;
		background: #f8f9fa;
		border-bottom: 1px solid var(--sp-border);
	}

	.sp-html-tab {
		padding: 6px 14px;
		font-size: 12px;
		font-weight: 500;
		border: none;
		background: none;
		cursor: pointer;
		color: var(--sp-text-muted);
		border-bottom: 2px solid transparent;
		transition: color 0.1s, border-color 0.1s;
		margin-bottom: -1px;
	}

	.sp-html-tab.active {
		color: var(--sp-text);
		border-bottom-color: var(--sp-primary);
		background: #fff;
	}

	.sp-html-textarea {
		width: 100%;
		display: block;
		padding: 14px;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 13px;
		line-height: 1.6;
		background: #282c34;
		color: #abb2bf;
		border: none;
		outline: none;
		resize: vertical;
		box-sizing: border-box;
	}

	.sp-html-textarea::placeholder {
		color: #5c6370;
	}

	.sp-html-preview {
		padding: 16px;
		min-height: 80px;
		font-size: 15px;
		line-height: 1.7;
	}

	.sp-html-preview-empty {
		color: var(--sp-text-muted);
		font-size: 13px;
	}
</style>
