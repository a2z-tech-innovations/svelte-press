<script lang="ts">
	import { enhance } from '$app/forms';

	import type { PageData, ActionData } from './$types.js';
	let { data, form }: { data: PageData; form?: ActionData } = $props();

	const o = data.opts;
	let submitting = $state(false);

	const structures = [
		{ value: '', label: 'Plain', example: '/?p=123' },
		{ value: '/%year%/%monthnum%/%day%/%postname%/', label: 'Day and name', example: '/2025/01/01/sample-post/' },
		{ value: '/%year%/%monthnum%/%postname%/', label: 'Month and name', example: '/2025/01/sample-post/' },
		{ value: '/archives/%post_id%', label: 'Numeric', example: '/archives/123' },
		{ value: '/%postname%/', label: 'Post name', example: '/sample-post/' }
	];

	let selected = $state(o['permalink_structure'] ?? '/%postname%/');
	const isCustom = $derived(!structures.find((s) => s.value === selected));
	let customStructure = $state(isCustom ? selected : '');
</script>

<svelte:head>
	<title>Permalink Settings — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Permalink Settings</h1>
</div>

{#if form?.success}
	<div class="sp-notice sp-notice-success">Permalink structure updated.</div>
{/if}

<form method="POST" action="?/save" use:enhance={() => { submitting = true; return async ({ update }) => { await update({ reset: false }); submitting = false; }; }}>
	<div class="sp-card" style="margin-bottom:16px;">
		<div class="sp-card-header"><h2 class="sp-card-title">Common Settings</h2></div>
		<div class="sp-card-body">
			<p style="font-size:13px;color:var(--sp-text-muted);margin-bottom:16px;">
				SveltePress offers you the ability to create a custom URL structure for your permalinks and archives.
			</p>

			{#each structures as s}
				<label style="display:flex;align-items:center;gap:12px;font-size:13px;margin-bottom:12px;">
					<input
						type="radio"
						name="permalink_structure"
						value={s.value}
						checked={selected === s.value}
						onchange={() => { selected = s.value; }}
					/>
					<div>
						<span style="font-weight:600;">{s.label}</span>
						<code style="display:block;font-size:12px;color:var(--sp-text-muted);margin-top:2px;">{s.example}</code>
					</div>
				</label>
			{/each}

			<label style="display:flex;align-items:flex-start;gap:12px;font-size:13px;margin-bottom:12px;">
				<input
					type="radio"
					name="permalink_structure"
					value={customStructure || selected}
					checked={isCustom}
					onchange={() => { selected = customStructure || '/%postname%/'; }}
					style="margin-top:3px;"
				/>
				<div style="flex:1;">
					<span style="font-weight:600;">Custom Structure</span>
					<div style="margin-top:4px;">
						<input
							type="text"
							class="sp-input"
							bind:value={customStructure}
							onfocus={() => { selected = customStructure || ''; }}
							placeholder="/%postname%/"
							style="max-width:400px;"
						/>
					</div>
					<div style="font-size:12px;color:var(--sp-text-muted);margin-top:4px;">
						Available tags: %year%, %monthnum%, %day%, %hour%, %minute%, %second%, %post_id%, %postname%, %category%, %author%
					</div>
				</div>
			</label>
		</div>
	</div>

	<div class="sp-card" style="margin-bottom:16px;">
		<div class="sp-card-header"><h2 class="sp-card-title">Optional</h2></div>
		<div class="sp-card-body">
			<p style="font-size:13px;color:var(--sp-text-muted);margin-bottom:16px;">
				If you like, you may enter custom structures for your category and tag URLs.
			</p>
			<table class="sp-settings-table">
				<tbody>
					<tr>
						<th><label class="sp-label" for="category_base">Category base</label></th>
						<td>
							<input type="text" id="category_base" name="category_base" class="sp-input" value={o['category_base'] ?? ''} placeholder="category" style="max-width:300px;" />
						</td>
					</tr>
					<tr>
						<th><label class="sp-label" for="tag_base">Tag base</label></th>
						<td>
							<input type="text" id="tag_base" name="tag_base" class="sp-input" value={o['tag_base'] ?? ''} placeholder="tag" style="max-width:300px;" />
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<p style="margin-top:4px;">
		<button type="submit" class="sp-btn sp-btn-primary" disabled={submitting}>
			{submitting ? 'Saving…' : 'Save Changes'}
		</button>
	</p>
</form>
