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
	let url = $derived(String(block.attrs.url ?? ''));
	let target = $derived(String(block.attrs.target ?? '_self') as '_self' | '_blank');
	let btnStyle = $derived(String(block.attrs.style ?? 'fill') as 'fill' | 'outline');

	$effect(() => {
		const id = block.id;
		if (id !== prevId) {
			prevId = id;
			localContent = untrack(() => (block.content ?? '').replace(/<!--[\s\S]*?-->/g, ''));
		}
	});

	function handleInput(e: Event) {
		const el = e.target as HTMLElement;
		onupdate({ ...block, content: el.textContent ?? '' });
	}

	function updateAttr(key: string, value: unknown) {
		onupdate({ ...block, attrs: { ...block.attrs, [key]: value } });
	}
</script>

<div class="sp-button-block">
	<div class="sp-button-preview">
		<span
			contenteditable="true"
			class="sp-button-editable"
			class:sp-button-fill={btnStyle === 'fill'}
			class:sp-button-outline={btnStyle === 'outline'}
			data-placeholder="Button text..."
			oninput={handleInput}
			onclick={(e) => e.stopPropagation()}
			role="textbox"
			aria-multiline="false"
			aria-label="Button text"
		>{localContent}</span>
	</div>

	<div class="sp-button-settings" onclick={(e) => e.stopPropagation()}>
		<div class="sp-button-settings-row">
			<input
				type="url"
				class="sp-input"
				placeholder="https://..."
				value={url}
				oninput={(e) => updateAttr('url', (e.target as HTMLInputElement).value)}
				style="flex:1"
			/>
		</div>
		<div class="sp-button-settings-row">
			<div class="sp-button-style-toggle">
				<button
					type="button"
					class="sp-btn-style-opt"
					class:active={btnStyle === 'fill'}
					onclick={() => updateAttr('style', 'fill')}
				>Fill</button>
				<button
					type="button"
					class="sp-btn-style-opt"
					class:active={btnStyle === 'outline'}
					onclick={() => updateAttr('style', 'outline')}
				>Outline</button>
			</div>
			<label class="sp-button-target-label">
				<input
					type="checkbox"
					checked={target === '_blank'}
					onchange={(e) => updateAttr('target', (e.target as HTMLInputElement).checked ? '_blank' : '_self')}
				/>
				<span>Open in new tab</span>
			</label>
		</div>
	</div>
</div>

<style>
	.sp-button-block {
		width: 100%;
	}

	.sp-button-preview {
		margin-bottom: 10px;
	}

	.sp-button-editable {
		display: inline-block;
		padding: 10px 24px;
		border-radius: 4px;
		font-size: 15px;
		font-weight: 500;
		cursor: text;
		outline: none;
		min-width: 80px;
		text-align: center;
		transition: background-color 0.1s;
	}

	.sp-button-editable:empty::before {
		content: attr(data-placeholder);
		color: rgba(255, 255, 255, 0.6);
		pointer-events: none;
	}

	.sp-button-fill {
		background: var(--sp-primary);
		color: #fff;
		border: 2px solid var(--sp-primary);
	}

	.sp-button-outline {
		background: transparent;
		color: var(--sp-primary);
		border: 2px solid var(--sp-primary);
	}

	.sp-button-settings {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px;
		background: #f8f9fa;
		border: 1px solid var(--sp-border);
		border-radius: 4px;
	}

	.sp-button-settings-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.sp-button-style-toggle {
		display: flex;
		border: 1px solid var(--sp-border);
		border-radius: 3px;
		overflow: hidden;
	}

	.sp-btn-style-opt {
		padding: 4px 10px;
		font-size: 12px;
		border: none;
		background: #fff;
		cursor: pointer;
		color: var(--sp-text-muted);
		transition: background-color 0.1s, color 0.1s;
	}

	.sp-btn-style-opt.active {
		background: var(--sp-primary);
		color: #fff;
	}

	.sp-button-target-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--sp-text-muted);
		cursor: pointer;
	}
</style>
