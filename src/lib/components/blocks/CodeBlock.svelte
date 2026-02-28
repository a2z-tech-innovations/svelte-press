<script lang="ts">
	import type { Block } from '$lib/types/index.js';

	let {
		block,
		onupdate
	}: {
		block: Block;
		onupdate: (block: Block) => void;
	} = $props();

	let language = $derived(String(block.attrs.language ?? 'plaintext'));

	const languages = [
		'plaintext', 'javascript', 'typescript', 'html', 'css', 'scss',
		'json', 'python', 'php', 'ruby', 'go', 'rust', 'java', 'c', 'cpp',
		'csharp', 'shell', 'bash', 'sql', 'yaml', 'toml', 'markdown', 'xml'
	];

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
			const val = ta.value;
			ta.value = val.substring(0, start) + '\t' + val.substring(end);
			ta.selectionStart = ta.selectionEnd = start + 1;
			onupdate({ ...block, content: ta.value });
		}
	}
</script>

<div class="sp-code-block">
	<div class="sp-code-header">
		<select
			class="sp-select sp-code-lang-select"
			value={language}
			onchange={(e) => onupdate({ ...block, attrs: { ...block.attrs, language: (e.target as HTMLSelectElement).value } })}
			onclick={(e) => e.stopPropagation()}
		>
			{#each languages as lang}
				<option value={lang}>{lang}</option>
			{/each}
		</select>
	</div>
	<textarea
		class="sp-code-textarea"
		value={block.content}
		oninput={handleInput}
		onkeydown={handleKeydown}
		placeholder="// Write your code here..."
		spellcheck={false}
		autocomplete="off"
		autocapitalize="off"
		onclick={(e) => e.stopPropagation()}
		rows={8}
	></textarea>
</div>

<style>
	.sp-code-block {
		width: 100%;
		border: 1px solid var(--sp-border);
		border-radius: 4px;
		overflow: hidden;
	}

	.sp-code-header {
		background: #1d2327;
		padding: 6px 10px;
		display: flex;
		align-items: center;
	}

	.sp-code-lang-select {
		font-size: 11px;
		padding: 2px 6px;
		background: #2c3338;
		border-color: #3c434a;
		color: #c3c4c7;
		height: auto;
	}

	.sp-code-textarea {
		width: 100%;
		display: block;
		padding: 14px 16px;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 13px;
		line-height: 1.6;
		background: #282c34;
		color: #abb2bf;
		border: none;
		outline: none;
		resize: vertical;
		tab-size: 2;
		box-sizing: border-box;
	}

	.sp-code-textarea::placeholder {
		color: #5c6370;
	}
</style>
