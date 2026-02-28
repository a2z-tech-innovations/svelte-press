<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { formatDate } from '$lib/utils.js';

	import type { PageData, ActionData } from './$types.js';
	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let search = $state(data.search);
	let selectedIds = $state<Set<number>>(new Set());
	let bulkAction = $state('');
	let allChecked = $state(false);

	function toggleAll(checked: boolean) {
		allChecked = checked;
		selectedIds = checked ? new Set(data.pages.map((p) => p.id)) : new Set();
	}

	function toggleOne(id: number, checked: boolean) {
		const next = new Set(selectedIds);
		if (checked) next.add(id);
		else next.delete(id);
		selectedIds = next;
		allChecked = next.size === data.pages.length;
	}

	const totalPages = $derived(Math.ceil(data.total / data.perPage));

	// Build page hierarchy map
	const pageMap = $derived(() => {
		const map = new Map<number, (typeof data.pages)[0]>();
		for (const p of data.pages) map.set(p.id, p);
		return map;
	});

	function getIndent(p: (typeof data.pages)[0]): number {
		let depth = 0;
		let cur = p;
		while (cur.parentId) {
			const parent = data.pages.find((x) => x.id === cur.parentId);
			if (!parent) break;
			depth++;
			cur = parent;
		}
		return depth;
	}

	function buildUrl(params: Record<string, string | number>) {
		const u = new URL(page.url);
		for (const [k, v] of Object.entries(params)) {
			if (v === '' || v === null || v === undefined) u.searchParams.delete(k);
			else u.searchParams.set(k, String(v));
		}
		return u.toString();
	}

	const statusTabs = [
		{ key: 'all', label: 'All' },
		{ key: 'publish', label: 'Published' },
		{ key: 'draft', label: 'Drafts' },
		{ key: 'pending', label: 'Pending Review' },
		{ key: 'private', label: 'Private' },
		{ key: 'trash', label: 'Trash' }
	];
</script>

<svelte:head>
	<title>Pages — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Pages</h1>
	<a href="/sp-admin/pages/new" class="sp-btn sp-btn-primary">Add New Page</a>
</div>

{#if form?.error}
	<div class="sp-notice sp-notice-error">{form.error}</div>
{/if}
{#if form?.success}
	<div class="sp-notice sp-notice-success">Action completed successfully.</div>
{/if}

<!-- Status Tabs -->
<div class="sp-status-tabs">
	{#each statusTabs as tab}
		{#if data.statusCounts[tab.key] > 0 || tab.key === 'all'}
			<a href={buildUrl({ status: tab.key, page: 1 })} class="sp-status-tab" class:active={data.status === tab.key}>
				{tab.label}
				<span class="sp-count-badge">{data.statusCounts[tab.key] ?? 0}</span>
			</a>
		{/if}
	{/each}
</div>

<!-- Bulk Actions + Search -->
<div style="display:flex; align-items:center; gap:10px; margin-bottom:12px; flex-wrap:wrap;">
	<form method="POST" action="?/bulk" use:enhance style="display:flex; align-items:center; gap:8px;">
		{#each [...selectedIds] as id}
			<input type="hidden" name="pageIds" value={id} />
		{/each}
		<div class="sp-bulk-actions">
			<select class="sp-select" bind:value={bulkAction} name="bulkAction" style="width:auto">
				<option value="">Bulk actions</option>
				{#if data.status === 'trash'}
					<option value="restore">Restore</option>
					<option value="delete">Delete Permanently</option>
				{:else}
					<option value="publish">Publish</option>
					<option value="trash">Move to Trash</option>
				{/if}
			</select>
			<button type="submit" class="sp-btn sp-btn-secondary sp-btn-sm" disabled={!selectedIds.size || !bulkAction}>Apply</button>
		</div>
	</form>

	<div style="margin-left:auto;">
		<form method="GET" style="display:flex; gap:8px;">
			<input type="hidden" name="status" value={data.status} />
			<div class="sp-search-box">
				<input type="search" name="search" class="sp-search-input" placeholder="Search pages…" bind:value={search} />
			</div>
			<button type="submit" class="sp-btn sp-btn-secondary sp-btn-sm">Search</button>
		</form>
	</div>
</div>

<!-- Table -->
<div class="sp-table-wrap">
	<table class="sp-table">
		<thead>
			<tr>
				<th style="width:36px">
					<input type="checkbox" checked={allChecked} onchange={(e) => toggleAll((e.target as HTMLInputElement).checked)} />
				</th>
				<th>Title</th>
				<th>Author</th>
				<th style="width:120px">Status</th>
				<th style="width:150px">Date</th>
			</tr>
		</thead>
		<tbody>
			{#if data.pages.length === 0}
				<tr>
					<td colspan="5" style="text-align:center; color:var(--sp-text-muted); padding:32px;">No pages found.</td>
				</tr>
			{/if}
			{#each data.pages as p}
				{@const indent = getIndent(p)}
				<tr>
					<td>
						<input
							type="checkbox"
							checked={selectedIds.has(p.id)}
							onchange={(e) => toggleOne(p.id, (e.target as HTMLInputElement).checked)}
						/>
					</td>
					<td>
						<span style="padding-left:{indent * 20}px; display:inline-block;">
							{#if indent > 0}
								<span style="color:var(--sp-text-muted); margin-right:4px;">— </span>
							{/if}
							<strong>
								<a href="/sp-admin/pages/{p.id}" style="color:var(--sp-text); text-decoration:none;">
									{p.title || '(no title)'}
								</a>
							</strong>
						</span>
						<div class="sp-row-actions" style="padding-left:{indent * 20}px">
							{#if p.status !== 'trash'}
								<a href="/sp-admin/pages/{p.id}">Edit</a>
								<span>|</span>
								<form method="POST" action="?/trash" use:enhance style="display:inline">
									<input type="hidden" name="id" value={p.id} />
									<button type="submit" class="sp-btn-link" style="color:var(--sp-danger)">Trash</button>
								</form>
								<span>|</span>
								<a href="/{p.slug}" target="_blank">View</a>
							{:else}
								<form method="POST" action="?/restore" use:enhance style="display:inline">
									<input type="hidden" name="id" value={p.id} />
									<button type="submit" class="sp-btn-link">Restore</button>
								</form>
								<span>|</span>
								<form method="POST" action="?/delete" use:enhance style="display:inline">
									<input type="hidden" name="id" value={p.id} />
									<button type="submit" class="sp-btn-link" style="color:var(--sp-danger)" onclick={(e) => { if (!confirm('Permanently delete this page?')) e.preventDefault(); }}>Delete Permanently</button>
								</form>
							{/if}
						</div>
					</td>
					<td style="font-size:13px; color:var(--sp-text-muted);">{p.authorName ?? '—'}</td>
					<td><span style="font-size:12px; text-transform:capitalize; color:var(--sp-text-muted);">{p.status}</span></td>
					<td>
						<span style="font-size:12px; color:var(--sp-text-muted);">
							{#if p.status === 'publish'}
								Published<br />{formatDate(p.postDate)}
							{:else}
								Last Modified<br />{formatDate(p.modifiedDate)}
							{/if}
						</span>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

{#if totalPages > 1}
	<div class="sp-pagination">
		{#if data.page > 1}
			<a href={buildUrl({ page: data.page - 1 })} class="sp-page-btn">&laquo; Previous</a>
		{/if}
		{#each Array.from({ length: totalPages }, (_, i) => i + 1) as pg}
			{#if Math.abs(pg - data.page) <= 2 || pg === 1 || pg === totalPages}
				<a href={buildUrl({ page: pg })} class="sp-page-btn" class:active={pg === data.page}>{pg}</a>
			{:else if Math.abs(pg - data.page) === 3}
				<span class="sp-page-btn" style="cursor:default">…</span>
			{/if}
		{/each}
		{#if data.page < totalPages}
			<a href={buildUrl({ page: data.page + 1 })} class="sp-page-btn">Next &raquo;</a>
		{/if}
	</div>
{/if}
