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
	let target = $derived((node.attrs.target as string) ?? '_self');
	let btnStyle = $derived((node.attrs.style as string) ?? 'fill');

	let urlInput = $state(url);
	let targetInput = $state(target);
	let styleInput = $state(btnStyle);

	function save() {
		const pos = getPos();
		if (pos === undefined) return;
		editor.view.dispatch(
			editor.state.tr.setNodeMarkup(pos, undefined, {
				...node.attrs,
				url: urlInput,
				target: targetInput,
				style: styleInput
			})
		);
	}
</script>

<div class="sp-button-nv" contenteditable="false">
	<div class="sp-button-preview" style="text-align:center;padding:12px 0;">
		<span class="sp-btn sp-btn-primary{styleInput === 'outline' ? ' sp-btn-outline' : ''}">
			{node.textContent || 'Click here'}
		</span>
	</div>
	<div class="sp-button-fields">
		<input
			type="url"
			class="sp-input"
			placeholder="URL"
			bind:value={urlInput}
			onblur={save}
			style="width:100%;margin-bottom:6px;"
		/>
		<div style="display:flex;gap:8px;">
			<select class="sp-select" bind:value={targetInput} onchange={save} style="flex:1;">
				<option value="_self">Same window</option>
				<option value="_blank">New tab</option>
			</select>
			<select class="sp-select" bind:value={styleInput} onchange={save} style="flex:1;">
				<option value="fill">Fill</option>
				<option value="outline">Outline</option>
			</select>
		</div>
	</div>
</div>

<style>
	.sp-button-nv {
		border: 2px dashed var(--sp-border, #c3c4c7);
		border-radius: 4px;
		padding: 12px;
	}

	.sp-button-fields {
		margin-top: 8px;
	}

	.sp-btn-outline {
		background: transparent;
		color: var(--sp-primary, #2271b1);
		border: 2px solid currentColor;
	}
</style>
