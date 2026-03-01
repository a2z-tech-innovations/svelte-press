<script lang="ts">
	import { useEditor } from '$lib/editor/use-editor.svelte.js';
	import { getExtensions } from '$lib/editor/extensions/index.js';
	import {
		SpacerWithView, GalleryWithView, VideoWithView, EmbedWithView,
		HtmlWithView, ShortcodeWithView, ButtonWithView
	} from '$lib/editor/extensions/with-node-views.svelte.js';
	import { isTiptapDoc, isLegacyBlocks } from '$lib/editor/backward-compat.js';
	import TiptapToolbar from './TiptapToolbar.svelte';
	import type { JSONContent } from '@tiptap/core';
	import type { ContentFormat } from '$lib/editor/backward-compat.js';

	let {
		initialContent = null,
		onchange
	}: {
		initialContent: ContentFormat;
		onchange: (json: JSONContent) => void;
	} = $props();

	// Determine starting content for Tiptap:
	// - If it's a Tiptap doc, use it directly
	// - If it's a legacy Block[], start fresh (old blocks render via backward compat on frontend)
	// - If null/undefined, start with an empty paragraph
	let startContent: JSONContent | string = '';
	if (initialContent) {
		if (isTiptapDoc(initialContent)) {
			startContent = initialContent;
		}
		// Legacy blocks → start empty in editor (they'll be shown via renderBlocks on frontend)
	}

	function getEditorExtensions() {
		const base = getExtensions();
		const nodeViewMap: Record<string, unknown> = {
			spacer: SpacerWithView,
			gallery: GalleryWithView,
			video: VideoWithView,
			embed: EmbedWithView,
			html: HtmlWithView,
			shortcode: ShortcodeWithView,
			button: ButtonWithView,
		};
		return base.map((ext) => {
			const override = nodeViewMap[(ext as { name?: string }).name ?? ''];
			return override ?? ext;
		});
	}

	let editorEl = $state<HTMLElement | null>(null);

	const editorHook = useEditor(() => ({
		element: editorEl!,
		extensions: getEditorExtensions(),
		content: startContent || '<p></p>',
		onUpdate({ editor: e }) {
			onchange(e.getJSON());
		},
		editorProps: {
			attributes: {
				class: 'sp-tiptap-prose',
				'data-sp-editor': 'true'
			}
		}
	}));
</script>

<div class="sp-tiptap-wrap">
	{#if editorHook.editor}
		<TiptapToolbar editor={editorHook.editor} />
	{/if}
	<div class="sp-tiptap-body">
		<div bind:this={editorEl} class="sp-tiptap-editor-el"></div>
	</div>
</div>

<style>
	.sp-tiptap-wrap {
		border: 1px solid var(--sp-border, #c3c4c7);
		border-radius: 4px;
		background: #fff;
		min-height: 400px;
		display: flex;
		flex-direction: column;
	}

	.sp-tiptap-body {
		flex: 1;
		overflow: auto;
	}

	:global(.sp-tiptap-prose) {
		padding: 24px 32px;
		outline: none;
		min-height: 360px;
		line-height: 1.7;
		font-size: 15px;
		color: var(--sp-text, #1d2327);
	}

	:global(.sp-tiptap-prose p) {
		margin-bottom: 0.75em;
	}

	:global(.sp-tiptap-prose h1),
	:global(.sp-tiptap-prose h2),
	:global(.sp-tiptap-prose h3),
	:global(.sp-tiptap-prose h4),
	:global(.sp-tiptap-prose h5),
	:global(.sp-tiptap-prose h6) {
		font-weight: 700;
		line-height: 1.3;
		margin-top: 1.5em;
		margin-bottom: 0.5em;
		color: var(--sp-text, #1d2327);
	}

	:global(.sp-tiptap-prose h2) { font-size: 1.5em; }
	:global(.sp-tiptap-prose h3) { font-size: 1.25em; }
	:global(.sp-tiptap-prose h4) { font-size: 1.1em; }

	:global(.sp-tiptap-prose blockquote) {
		border-left: 3px solid var(--sp-border, #c3c4c7);
		padding-left: 1em;
		color: #646970;
		font-style: italic;
		margin: 1em 0;
	}

	:global(.sp-tiptap-prose pre) {
		background: #f6f7f7;
		border: 1px solid var(--sp-border, #c3c4c7);
		border-radius: 4px;
		padding: 1em;
		overflow-x: auto;
		font-family: 'Fira Code', Consolas, monospace;
		font-size: 0.875em;
	}

	:global(.sp-tiptap-prose ul),
	:global(.sp-tiptap-prose ol) {
		padding-left: 1.5em;
		margin-bottom: 0.75em;
	}

	:global(.sp-tiptap-prose a) {
		color: var(--sp-primary, #2271b1);
		text-decoration: underline;
	}

	:global(.sp-tiptap-prose table) {
		border-collapse: collapse;
		width: 100%;
		margin-bottom: 1em;
	}

	:global(.sp-tiptap-prose th),
	:global(.sp-tiptap-prose td) {
		border: 1px solid var(--sp-border, #c3c4c7);
		padding: 0.5em 0.75em;
		text-align: left;
	}

	:global(.sp-tiptap-prose th) {
		background: #f6f7f7;
		font-weight: 600;
	}

	/* Placeholder */
	:global(.sp-tiptap-prose p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: var(--sp-text-muted, #646970);
		pointer-events: none;
		height: 0;
	}

	/* Node view wrapper */
	:global([data-node-view-wrapper]) {
		position: relative;
	}

	/* Show block controls on hover */
	:global([data-node-view-wrapper]:hover .sp-block-controls) {
		opacity: 1;
		pointer-events: all;
	}

	/* Columns layout */
	:global(.sp-columns-wrap) {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin-bottom: 1em;
	}

	:global(.sp-column) {
		min-height: 60px;
		border: 1px dashed var(--sp-border, #c3c4c7);
		border-radius: 4px;
		padding: 8px;
	}
</style>
