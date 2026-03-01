<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import type { Node } from '@tiptap/pm/model';

	let {
		node,
		editor,
		getPos
	}: {
		node: Node;
		editor: Editor;
		getPos: () => number | undefined;
	} = $props();

	let url = $derived((node.attrs.url as string) ?? '');
	let embedHtml = $derived((node.attrs.embedHtml as string) ?? '');
	let caption = $derived((node.attrs.caption as string) ?? '');

	let urlInput = $state(url);
	let captionInput = $state(caption);
	let fetching = $state(false);
	let fetchError = $state('');

	async function fetchEmbed() {
		if (!urlInput.trim()) return;
		fetching = true;
		fetchError = '';
		try {
			const res = await fetch(`/api/oembed?url=${encodeURIComponent(urlInput.trim())}`);
			const data = await res.json();
			if (data.html) {
				updateAttrs({ url: urlInput, embedHtml: data.html as string, caption: captionInput });
			} else {
				fetchError = data.error ?? 'Could not fetch embed.';
				updateAttrs({ url: urlInput, embedHtml: '', caption: captionInput });
			}
		} catch {
			fetchError = 'Network error.';
		} finally {
			fetching = false;
		}
	}

	function updateAttrs(attrs: Record<string, string>) {
		const pos = getPos();
		if (pos === undefined) return;
		editor.view.dispatch(
			editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs })
		);
	}
</script>

<div class="sp-embed-nv" contenteditable="false">
	{#if embedHtml}
		<div class="sp-embed-preview">
			{@html embedHtml}
		</div>
	{:else}
		<div class="sp-embed-placeholder">
			<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
			<span>Embed Block</span>
		</div>
	{/if}

	<div class="sp-embed-controls">
		<div style="display:flex;gap:6px;align-items:center;">
			<input
				type="url"
				class="sp-input"
				placeholder="Paste URL (YouTube, Vimeo, Twitter…)"
				bind:value={urlInput}
				onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fetchEmbed(); } }}
				style="flex:1;"
			/>
			<button type="button" class="sp-btn sp-btn-secondary sp-btn-sm" onclick={fetchEmbed} disabled={fetching}>
				{fetching ? 'Loading…' : 'Embed'}
			</button>
		</div>
		{#if fetchError}
			<p style="font-size:12px; color:var(--sp-error,#d63638); margin-top:4px;">{fetchError}</p>
		{/if}
		{#if embedHtml}
			<input
				type="text"
				class="sp-input"
				placeholder="Caption (optional)"
				bind:value={captionInput}
				onblur={() => updateAttrs({ url: urlInput, embedHtml, caption: captionInput })}
				style="width:100%;margin-top:6px;"
			/>
		{/if}
	</div>
</div>

<style>
	.sp-embed-nv {
		border: 2px dashed var(--sp-border, #c3c4c7);
		border-radius: 4px;
		padding: 12px;
	}

	.sp-embed-placeholder {
		min-height: 60px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		color: var(--sp-text-muted, #646970);
		font-size: 13px;
		margin-bottom: 12px;
	}

	.sp-embed-preview {
		margin-bottom: 12px;
		border-radius: 4px;
		overflow: hidden;
	}

	.sp-embed-controls {
		margin-top: 8px;
	}
</style>
