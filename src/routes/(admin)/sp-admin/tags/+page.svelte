<script lang="ts">
	import { enhance } from '$app/forms';
	import { slugify } from '$lib/utils.js';

	import type { PageData, ActionData } from './$types.js';
	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let addName = $state(form?.name ?? '');
	let addSlug = $state(form?.slug ?? '');
	let addDescription = $state(form?.description ?? '');
	let editingId = $state<number | null>(null);
	let editName = $state('');
	let editSlug = $state('');
	let editDescription = $state('');

	$effect(() => {
		if (addName && !addSlug) {
			addSlug = slugify(addName);
		}
	});

	function startEdit(tag: (typeof data.tags)[0]) {
		editingId = tag.id;
		editName = tag.name;
		editSlug = tag.slug;
		editDescription = tag.description ?? '';
	}

	function cancelEdit() {
		editingId = null;
	}
</script>

<svelte:head>
	<title>Tags — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Tags</h1>
</div>

{#if form?.addSuccess}
	<div class="sp-notice sp-notice-success">Tag added.</div>
{/if}
{#if form?.updateSuccess}
	<div class="sp-notice sp-notice-success">Tag updated.</div>
{/if}
{#if form?.deleteSuccess}
	<div class="sp-notice sp-notice-success">Tag deleted.</div>
{/if}

<div style="display:grid; grid-template-columns:340px 1fr; gap:24px; align-items:start;">
	<!-- Add Tag Form -->
	<div class="sp-card">
		<div class="sp-card-header">
			<h2 class="sp-card-title">Add New Tag</h2>
		</div>
		<div class="sp-card-body">
			{#if form?.addError}
				<div class="sp-notice sp-notice-error" style="margin-bottom:12px;">{form.addError}</div>
			{/if}
			<form method="POST" action="?/add" use:enhance={() => { return async ({ update }) => { await update(); addName = ''; addSlug = ''; addDescription = ''; }; }}>
				<div class="sp-field">
					<label class="sp-label" for="add-name">Name <span style="color:var(--sp-danger)">*</span></label>
					<input type="text" id="add-name" name="name" class="sp-input" bind:value={addName} required />
					<p style="font-size:12px;color:var(--sp-text-muted);margin-top:4px;">The name is how it appears on your site.</p>
				</div>
				<div class="sp-field">
					<label class="sp-label" for="add-slug">Slug</label>
					<input type="text" id="add-slug" name="slug" class="sp-input" bind:value={addSlug} />
					<p style="font-size:12px;color:var(--sp-text-muted);margin-top:4px;">The "slug" is the URL-friendly version of the name.</p>
				</div>
				<div class="sp-field">
					<label class="sp-label" for="add-desc">Description</label>
					<textarea id="add-desc" name="description" class="sp-textarea" bind:value={addDescription} style="min-height:80px;"></textarea>
					<p style="font-size:12px;color:var(--sp-text-muted);margin-top:4px;">The description is not prominent by default.</p>
				</div>
				<button type="submit" class="sp-btn sp-btn-primary">Add New Tag</button>
			</form>
		</div>
	</div>

	<!-- Tags Table -->
	<div>
		<div class="sp-table-wrap">
			<table class="sp-table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Description</th>
						<th>Slug</th>
						<th style="width:60px; text-align:center;">Count</th>
					</tr>
				</thead>
				<tbody>
					{#if data.tags.length === 0}
						<tr>
							<td colspan="4" style="text-align:center; color:var(--sp-text-muted); padding:32px;">No tags yet.</td>
						</tr>
					{/if}
					{#each data.tags as tag}
						{#if editingId === tag.id}
							<tr style="background:#f6f7f7;">
								<td colspan="4">
									{#if form?.updateError && form.updateId === tag.id}
										<div class="sp-notice sp-notice-error" style="margin-bottom:8px;">{form.updateError}</div>
									{/if}
									<form method="POST" action="?/update" use:enhance={() => { return async ({ update }) => { await update(); editingId = null; }; }}>
										<input type="hidden" name="id" value={tag.id} />
										<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
											<div class="sp-field">
												<label class="sp-label">Name</label>
												<input type="text" name="name" class="sp-input" bind:value={editName} required />
											</div>
											<div class="sp-field">
												<label class="sp-label">Slug</label>
												<input type="text" name="slug" class="sp-input" bind:value={editSlug} />
											</div>
											<div class="sp-field" style="grid-column:span 2">
												<label class="sp-label">Description</label>
												<input type="text" name="description" class="sp-input" bind:value={editDescription} />
											</div>
										</div>
										<div style="display:flex; gap:8px;">
											<button type="submit" class="sp-btn sp-btn-primary sp-btn-sm">Update</button>
											<button type="button" class="sp-btn sp-btn-secondary sp-btn-sm" onclick={cancelEdit}>Cancel</button>
										</div>
									</form>
								</td>
							</tr>
						{:else}
							<tr>
								<td>
									<strong>{tag.name}</strong>
									<div class="sp-row-actions">
										<button type="button" class="sp-btn-link" onclick={() => startEdit(tag)}>Edit</button>
										<span>|</span>
										<form method="POST" action="?/delete" use:enhance style="display:inline">
											<input type="hidden" name="id" value={tag.id} />
											<button type="submit" class="sp-btn-link" style="color:var(--sp-danger)" onclick={(e) => { if (!confirm('Delete this tag?')) e.preventDefault(); }}>Delete</button>
										</form>
									</div>
								</td>
								<td style="font-size:13px; color:var(--sp-text-muted);">{tag.description || '—'}</td>
								<td style="font-size:13px; color:var(--sp-text-muted);">{tag.slug}</td>
								<td style="text-align:center; font-size:13px;">{tag.count}</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
