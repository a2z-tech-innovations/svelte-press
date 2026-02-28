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

	$effect(() => {
		if (allChecked) {
			selectedIds = new Set(data.posts.map((p) => p.id));
		} else if (selectedIds.size === data.posts.length && data.posts.length > 0) {
			// don't auto uncheck
		} else {
			// handled by individual checkboxes
		}
	});

	function toggleAll(checked: boolean) {
		allChecked = checked;
		if (checked) {
			selectedIds = new Set(data.posts.map((p) => p.id));
		} else {
			selectedIds = new Set();
		}
	}

	function toggleOne(id: number, checked: boolean) {
		const next = new Set(selectedIds);
		if (checked) next.add(id);
		else next.delete(id);
		selectedIds = next;
		allChecked = next.size === data.posts.length;
	}

	const totalPages = $derived(Math.ceil(data.total / data.perPage));

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
	<title>Posts — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Posts</h1>
	<a href="/sp-admin/posts/new" class="sp-btn sp-btn-primary">Add New Post</a>
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
			<a
				href={buildUrl({ status: tab.key, page: 1 })}
				class="sp-status-tab"
				class:active={data.status === tab.key}
			>
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
			<input type="hidden" name="postIds" value={id} />
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
			<button type="submit" class="sp-btn sp-btn-secondary sp-btn-sm" disabled={!selectedIds.size || !bulkAction}>
				Apply
			</button>
		</div>
	</form>

	<div style="margin-left:auto;">
		<form method="GET" style="display:flex; gap:8px;">
			<input type="hidden" name="status" value={data.status} />
			<div class="sp-search-box">
				<input
					type="search"
					name="search"
					class="sp-search-input"
					placeholder="Search posts…"
					bind:value={search}
				/>
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
			{#if data.posts.length === 0}
				<tr>
					<td colspan="5" style="text-align:center; color:var(--sp-text-muted); padding:32px;">
						No posts found.
					</td>
				</tr>
			{/if}
			{#each data.posts as post}
				<tr>
					<td>
						<input
							type="checkbox"
							checked={selectedIds.has(post.id)}
							onchange={(e) => toggleOne(post.id, (e.target as HTMLInputElement).checked)}
						/>
					</td>
					<td>
						<strong>
							<a href="/sp-admin/posts/{post.id}" style="color:var(--sp-text); text-decoration:none;">
								{post.title || '(no title)'}
							</a>
							{#if post.sticky}
								<span style="font-size:11px; background:#fff3cd; color:#856404; border:1px solid #ffc107; border-radius:3px; padding:1px 5px; margin-left:4px;">Sticky</span>
							{/if}
						</strong>
						<div class="sp-row-actions">
							{#if post.status !== 'trash'}
								<a href="/sp-admin/posts/{post.id}">Edit</a>
								<span>|</span>
								<a href="/sp-admin/posts/{post.id}">Quick Edit</a>
								<span>|</span>
								<form method="POST" action="?/trash" use:enhance style="display:inline">
									<input type="hidden" name="id" value={post.id} />
									<button type="submit" class="sp-btn-link" style="color:var(--sp-danger)">Trash</button>
								</form>
								<span>|</span>
								<a href="/{post.slug}" target="_blank">View</a>
							{:else}
								<form method="POST" action="?/restore" use:enhance style="display:inline">
									<input type="hidden" name="id" value={post.id} />
									<button type="submit" class="sp-btn-link">Restore</button>
								</form>
								<span>|</span>
								<form method="POST" action="?/delete" use:enhance style="display:inline">
									<input type="hidden" name="id" value={post.id} />
									<button type="submit" class="sp-btn-link" style="color:var(--sp-danger)" onclick={(e) => { if (!confirm('Permanently delete this post?')) e.preventDefault(); }}>Delete Permanently</button>
								</form>
							{/if}
						</div>
					</td>
					<td>
						<a href={`/sp-admin/posts?author=${post.authorId}`} style="color:var(--sp-text-muted); text-decoration:none; font-size:13px;">
							{post.authorName ?? '—'}
						</a>
					</td>
					<td>
						<span style="font-size:12px; text-transform:capitalize; color:var(--sp-text-muted);">{post.status}</span>
					</td>
					<td>
						<span style="font-size:12px; color:var(--sp-text-muted);">
							{#if post.status === 'publish'}
								Published<br />{formatDate(post.postDate)}
							{:else}
								Last Modified<br />{formatDate(post.modifiedDate)}
							{/if}
						</span>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<!-- Pagination -->
{#if totalPages > 1}
	<div class="sp-pagination">
		{#if data.page > 1}
			<a href={buildUrl({ page: data.page - 1 })} class="sp-page-btn">&laquo; Previous</a>
		{/if}
		{#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
			{#if Math.abs(p - data.page) <= 2 || p === 1 || p === totalPages}
				<a href={buildUrl({ page: p })} class="sp-page-btn" class:active={p === data.page}>{p}</a>
			{:else if Math.abs(p - data.page) === 3}
				<span class="sp-page-btn" style="cursor:default">…</span>
			{/if}
		{/each}
		{#if data.page < totalPages}
			<a href={buildUrl({ page: data.page + 1 })} class="sp-page-btn">Next &raquo;</a>
		{/if}
	</div>
{/if}
