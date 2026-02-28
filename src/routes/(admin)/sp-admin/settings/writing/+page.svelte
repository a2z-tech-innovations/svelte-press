<script lang="ts">
	import { enhance } from '$app/forms';

	import type { PageData, ActionData } from './$types.js';
	let { data, form }: { data: PageData; form?: ActionData } = $props();

	const o = data.opts;
	const formats = [
		{ value: 'standard', label: 'Standard' },
		{ value: 'aside', label: 'Aside' },
		{ value: 'gallery', label: 'Gallery' },
		{ value: 'link', label: 'Link' },
		{ value: 'image', label: 'Image' },
		{ value: 'quote', label: 'Quote' },
		{ value: 'status', label: 'Status' },
		{ value: 'video', label: 'Video' },
		{ value: 'audio', label: 'Audio' },
		{ value: 'chat', label: 'Chat' }
	];

	let submitting = $state(false);
</script>

<svelte:head>
	<title>Writing Settings — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Writing Settings</h1>
</div>

{#if form?.success}
	<div class="sp-notice sp-notice-success">Settings saved.</div>
{/if}

<form method="POST" action="?/save" use:enhance={() => { submitting = true; return async ({ update }) => { await update({ reset: false }); submitting = false; }; }}>
	<table class="sp-settings-table">
		<tbody>
			<tr>
				<th><label class="sp-label" for="default_category">Default Post Category</label></th>
				<td>
					<select id="default_category" name="default_category" class="sp-select">
						{#each data.categories as cat}
							<option value={cat.id} selected={o['default_category'] === String(cat.id)}>{cat.name}</option>
						{/each}
					</select>
				</td>
			</tr>
			<tr>
				<th><label class="sp-label" for="default_post_format">Default Post Format</label></th>
				<td>
					<select id="default_post_format" name="default_post_format" class="sp-select">
						{#each formats as fmt}
							<option value={fmt.value} selected={o['default_post_format'] === fmt.value}>{fmt.label}</option>
						{/each}
					</select>
				</td>
			</tr>
		</tbody>
	</table>

	<p style="margin-top:20px;">
		<button type="submit" class="sp-btn sp-btn-primary" disabled={submitting}>
			{submitting ? 'Saving…' : 'Save Changes'}
		</button>
	</p>
</form>
