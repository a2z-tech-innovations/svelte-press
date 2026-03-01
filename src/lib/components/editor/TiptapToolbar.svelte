<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import BlockInserterMenu from './BlockInserterMenu.svelte';

	let { editor }: { editor: Editor } = $props();

	type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

	let currentBlockType = $derived(() => {
		if (editor.isActive('heading', { level: 1 })) return 'h1';
		if (editor.isActive('heading', { level: 2 })) return 'h2';
		if (editor.isActive('heading', { level: 3 })) return 'h3';
		if (editor.isActive('heading', { level: 4 })) return 'h4';
		if (editor.isActive('blockquote')) return 'quote';
		if (editor.isActive('bulletList')) return 'ul';
		if (editor.isActive('orderedList')) return 'ol';
		if (editor.isActive('codeBlock')) return 'code';
		return 'p';
	});

	function setBlockType(type: string) {
		switch (type) {
			case 'p': editor.chain().focus().setParagraph().run(); break;
			case 'h1': editor.chain().focus().setHeading({ level: 1 as HeadingLevel }).run(); break;
			case 'h2': editor.chain().focus().setHeading({ level: 2 as HeadingLevel }).run(); break;
			case 'h3': editor.chain().focus().setHeading({ level: 3 as HeadingLevel }).run(); break;
			case 'h4': editor.chain().focus().setHeading({ level: 4 as HeadingLevel }).run(); break;
			case 'quote': editor.chain().focus().setBlockquote().run(); break;
			case 'ul': editor.chain().focus().toggleBulletList().run(); break;
			case 'ol': editor.chain().focus().toggleOrderedList().run(); break;
			case 'code': editor.chain().focus().toggleCodeBlock().run(); break;
		}
	}

	let linkUrl = $state('');
	let showLinkInput = $state(false);

	function setLink() {
		const url = linkUrl.trim();
		if (!url) {
			editor.chain().focus().unsetLink().run();
		} else {
			editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
		}
		showLinkInput = false;
		linkUrl = '';
	}

	function toggleLinkInput() {
		if (editor.isActive('link')) {
			editor.chain().focus().unsetLink().run();
		} else {
			showLinkInput = !showLinkInput;
			if (showLinkInput) {
				const attrs = editor.getAttributes('link');
				linkUrl = (attrs.href as string) ?? '';
			}
		}
	}
</script>

<div class="sp-tiptap-toolbar">
	<!-- Block inserter -->
	<BlockInserterMenu {editor} />

	<div class="sp-toolbar-sep"></div>

	<!-- Block type selector -->
	<select
		class="sp-toolbar-select"
		value={currentBlockType()}
		onchange={(e) => setBlockType((e.target as HTMLSelectElement).value)}
		aria-label="Block type"
	>
		<option value="p">Paragraph</option>
		<option value="h1">Heading 1</option>
		<option value="h2">Heading 2</option>
		<option value="h3">Heading 3</option>
		<option value="h4">Heading 4</option>
		<option value="quote">Quote</option>
		<option value="ul">Bullet List</option>
		<option value="ol">Numbered List</option>
		<option value="code">Code Block</option>
	</select>

	<div class="sp-toolbar-sep"></div>

	<!-- Inline formatting -->
	<button
		type="button"
		class="sp-toolbar-btn"
		class:active={editor.isActive('bold')}
		onclick={() => editor.chain().focus().toggleBold().run()}
		title="Bold (Ctrl+B)"
		aria-label="Bold"
	><strong>B</strong></button>

	<button
		type="button"
		class="sp-toolbar-btn"
		class:active={editor.isActive('italic')}
		onclick={() => editor.chain().focus().toggleItalic().run()}
		title="Italic (Ctrl+I)"
		aria-label="Italic"
	><em>I</em></button>

	<button
		type="button"
		class="sp-toolbar-btn"
		class:active={editor.isActive('underline')}
		onclick={() => editor.chain().focus().toggleUnderline().run()}
		title="Underline (Ctrl+U)"
		aria-label="Underline"
	><u>U</u></button>

	<button
		type="button"
		class="sp-toolbar-btn"
		class:active={editor.isActive('strike')}
		onclick={() => editor.chain().focus().toggleStrike().run()}
		title="Strikethrough"
		aria-label="Strikethrough"
	><s>S</s></button>

	<button
		type="button"
		class="sp-toolbar-btn"
		class:active={editor.isActive('code')}
		onclick={() => editor.chain().focus().toggleCode().run()}
		title="Inline Code"
		aria-label="Inline code"
	>`c`</button>

	<div class="sp-toolbar-sep"></div>

	<!-- Text alignment -->
	<button
		type="button"
		class="sp-toolbar-btn"
		class:active={editor.isActive({ textAlign: 'left' })}
		onclick={() => editor.chain().focus().setTextAlign('left').run()}
		title="Align left"
		aria-label="Align left"
	>
		<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="1" y="2" width="12" height="1.5"/><rect x="1" y="5.5" width="8" height="1.5"/><rect x="1" y="9" width="12" height="1.5"/><rect x="1" y="12.5" width="8" height="1.5"/></svg>
	</button>
	<button
		type="button"
		class="sp-toolbar-btn"
		class:active={editor.isActive({ textAlign: 'center' })}
		onclick={() => editor.chain().focus().setTextAlign('center').run()}
		title="Align center"
		aria-label="Align center"
	>
		<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="1" y="2" width="12" height="1.5"/><rect x="3" y="5.5" width="8" height="1.5"/><rect x="1" y="9" width="12" height="1.5"/><rect x="3" y="12.5" width="8" height="1.5"/></svg>
	</button>
	<button
		type="button"
		class="sp-toolbar-btn"
		class:active={editor.isActive({ textAlign: 'right' })}
		onclick={() => editor.chain().focus().setTextAlign('right').run()}
		title="Align right"
		aria-label="Align right"
	>
		<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="1" y="2" width="12" height="1.5"/><rect x="5" y="5.5" width="8" height="1.5"/><rect x="1" y="9" width="12" height="1.5"/><rect x="5" y="12.5" width="8" height="1.5"/></svg>
	</button>

	<div class="sp-toolbar-sep"></div>

	<!-- Link -->
	<div class="sp-toolbar-link-wrap">
		<button
			type="button"
			class="sp-toolbar-btn"
			class:active={editor.isActive('link')}
			onclick={toggleLinkInput}
			title="Link"
			aria-label="Link"
		>
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5.5 9a3.5 3.5 0 005 0l2-2a3.5 3.5 0 00-5-5L6 3.5"/><path d="M8.5 5a3.5 3.5 0 00-5 0l-2 2a3.5 3.5 0 005 5L8 10.5"/></svg>
		</button>
		{#if showLinkInput}
			<div class="sp-link-input-wrap">
				<input
					type="url"
					class="sp-input"
					placeholder="https://…"
					bind:value={linkUrl}
					onkeydown={(e) => { if (e.key === 'Enter') setLink(); if (e.key === 'Escape') { showLinkInput = false; } }}
					style="font-size:12px;"
					autofocus
				/>
				<button type="button" class="sp-btn sp-btn-primary sp-btn-sm" onclick={setLink}>Apply</button>
			</div>
		{/if}
	</div>

	<div class="sp-toolbar-sep"></div>

	<!-- Undo/Redo -->
	<button
		type="button"
		class="sp-toolbar-btn"
		onclick={() => editor.chain().focus().undo().run()}
		disabled={!editor.can().undo()}
		title="Undo (Ctrl+Z)"
		aria-label="Undo"
	>
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 7a5 5 0 105-5H3"/><polyline points="6 2 3 5 6 8"/></svg>
	</button>
	<button
		type="button"
		class="sp-toolbar-btn"
		onclick={() => editor.chain().focus().redo().run()}
		disabled={!editor.can().redo()}
		title="Redo (Ctrl+Y)"
		aria-label="Redo"
	>
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 7a5 5 0 10-5-5h4"/><polyline points="8 2 11 5 8 8"/></svg>
	</button>
</div>

<style>
	.sp-tiptap-toolbar {
		display: flex;
		align-items: center;
		gap: 2px;
		flex-wrap: wrap;
		padding: 6px 8px;
		border-bottom: 1px solid var(--sp-border, #c3c4c7);
		background: #f6f7f7;
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.sp-toolbar-sep {
		width: 1px;
		height: 20px;
		background: var(--sp-border, #c3c4c7);
		margin: 0 4px;
		flex-shrink: 0;
	}

	.sp-toolbar-btn {
		width: 28px;
		height: 28px;
		border: 1px solid transparent;
		border-radius: 3px;
		background: transparent;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		color: var(--sp-text, #1d2327);
		font-family: inherit;
		transition: background 0.1s, border-color 0.1s;
	}

	.sp-toolbar-btn:hover:not(:disabled) {
		background: #e8e9ea;
		border-color: var(--sp-border, #c3c4c7);
	}

	.sp-toolbar-btn.active {
		background: var(--sp-primary, #2271b1);
		color: #fff;
		border-color: var(--sp-primary, #2271b1);
	}

	.sp-toolbar-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.sp-toolbar-select {
		height: 28px;
		font-size: 12px;
		border: 1px solid var(--sp-border, #c3c4c7);
		border-radius: 3px;
		padding: 0 6px;
		background: #fff;
		color: var(--sp-text, #1d2327);
		cursor: pointer;
		font-family: inherit;
	}

	.sp-toolbar-link-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}

	.sp-link-input-wrap {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		display: flex;
		gap: 6px;
		align-items: center;
		background: #fff;
		border: 1px solid var(--sp-border, #c3c4c7);
		border-radius: 4px;
		padding: 8px;
		box-shadow: 0 4px 12px rgba(0,0,0,0.1);
		z-index: 20;
		white-space: nowrap;
	}

	.sp-link-input-wrap .sp-input {
		width: 220px;
	}
</style>
