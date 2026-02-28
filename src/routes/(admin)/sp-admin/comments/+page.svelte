<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { truncate, formatDate } from '$lib/utils.js';

	import type { PageData, ActionData } from './$types.js';
	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let search = $state(data.search);
	let selectedIds = $state<Set<number>>(new Set());
	let bulkAction = $state('');
	let allChecked = $state(false);
	let replyingTo = $state<number | null>(null);
	let replyContent = $state('');

	function toggleAll(checked: boolean) {
		allChecked = checked;
		selectedIds = checked ? new Set(data.comments.map((c) => c.id)) : new Set();
	}

	function toggleOne(id: number, checked: boolean) {
		const next = new Set(selectedIds);
		if (checked) next.add(id);
		else next.delete(id);
		selectedIds = next;
		allChecked = next.size === data.comments.length;
	}

	const totalPages = $derived(Math.ceil(data.total / data.perPage));

	function buildUrl(params: Record<string, string | number>) {
		const u = new URL(page.url);
		for (const [k, v] of Object.entries(params)) {
			if (v === '' || v === null) u.searchParams.delete(k);
			else u.searchParams.set(k, String(v));
		}
		return u.toString();
	}

	const statusTabs = [
		{ key: 'all', label: 'All' },
		{ key: 'pending', label: 'Pending' },
		{ key: 'approved', label: 'Approved' },
		{ key: 'spam', label: 'Spam' },
		{ key: 'trash', label: 'Trash' }
	];
</script>

<svelte:head>
	<title>Comments — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Comments</h1>
</div>

{#if form?.error}
	<div class="sp-notice sp-notice-error">{form.error}</div>
{/if}
{#if form?.success}
	<div class="sp-notice sp-notice-success">Action completed.</div>
{/if}

<!-- Status Tabs -->
<div class="sp-status-tabs">
	{#each statusTabs as tab}
		<a href={buildUrl({ status: tab.key, page: 1 })} class="sp-status-tab" class:active={data.status === tab.key}>
			{tab.label}
			<span class="sp-count-badge">{data.statusCounts[tab.key] ?? 0}</span>
		</a>
	{/each}
</div>

<!-- Bulk + Search -->
<div style="display:flex; align-items:center; gap:10px; margin-bottom:12px; flex-wrap:wrap;">
	<form method="POST" action="?/bulk" use:enhance style="display:flex; align-items:center; gap:8px;">
		{#each [...selectedIds] as id}
			<input type="hidden" name="commentIds" value={id} />
		{/each}
		<div class="sp-bulk-actions">
			<select class="sp-select" bind:value={bulkAction} name="bulkAction" style="width:auto">
				<option value="">Bulk actions</option>
				<option value="approve">Approve</option>
				<option value="unapprove">Unapprove</option>
				<option value="spam">Mark as Spam</option>
				<option value="trash">Move to Trash</option>
				<option value="delete">Delete Permanently</option>
			</select>
			<button type="submit" class="sp-btn sp-btn-secondary sp-btn-sm" disabled={!selectedIds.size || !bulkAction}>Apply</button>
		</div>
	</form>

	<div style="margin-left:auto;">
		<form method="GET" style="display:flex; gap:8px;">
			<input type="hidden" name="status" value={data.status} />
			<div class="sp-search-box">
				<input type="search" name="search" class="sp-search-input" placeholder="Search comments…" bind:value={search} />
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
				<th>Author</th>
				<th>Comment</th>
				<th style="width:160px">In response to</th>
				<th style="width:120px">Date</th>
			</tr>
		</thead>
		<tbody>
			{#if data.comments.length === 0}
				<tr>
					<td colspan="5" style="text-align:center; color:var(--sp-text-muted); padding:32px;">No comments found.</td>
				</tr>
			{/if}
			{#each data.comments as comment}
				<tr class:pending={comment.status === 'pending'} style={comment.status === 'pending' ? 'background:#fff8e5;' : ''}>
					<td>
						<input
							type="checkbox"
							checked={selectedIds.has(comment.id)}
							onchange={(e) => toggleOne(comment.id, (e.target as HTMLInputElement).checked)}
						/>
					</td>
					<td style="min-width:140px;">
						<div style="display:flex; flex-direction:column; gap:2px;">
							<strong style="font-size:13px;">
								{#if comment.authorUrl}
									<a href={comment.authorUrl} target="_blank" style="color:var(--sp-text);text-decoration:none;">{comment.authorName}</a>
								{:else}
									{comment.authorName}
								{/if}
							</strong>
							<a href="mailto:{comment.authorEmail}" style="font-size:12px; color:var(--sp-text-muted);">{comment.authorEmail}</a>
							<span style="font-size:11px; color:var(--sp-text-muted);">{comment.authorIp}</span>
						</div>
					</td>
					<td>
						{#if comment.status === 'pending'}
							<span style="font-size:11px; background:#ffc107; color:#856404; border-radius:3px; padding:1px 6px; margin-right:6px;">Pending</span>
						{/if}
						<p style="margin:0 0 8px; font-size:13px;">{comment.content}</p>

						<!-- Row Actions -->
						<div class="sp-row-actions">
							{#if comment.status !== 'approved'}
								<form method="POST" action="?/approve" use:enhance style="display:inline">
									<input type="hidden" name="id" value={comment.id} />
									<button type="submit" class="sp-btn-link" style="color:var(--sp-success)">Approve</button>
								</form>
								<span>|</span>
							{:else}
								<form method="POST" action="?/unapprove" use:enhance style="display:inline">
									<input type="hidden" name="id" value={comment.id} />
									<button type="submit" class="sp-btn-link">Unapprove</button>
								</form>
								<span>|</span>
							{/if}
							<button type="button" class="sp-btn-link" onclick={() => { replyingTo = replyingTo === comment.id ? null : comment.id; replyContent = ''; }}>
								Reply
							</button>
							<span>|</span>
							<form method="POST" action="?/spam" use:enhance style="display:inline">
								<input type="hidden" name="id" value={comment.id} />
								<button type="submit" class="sp-btn-link" style="color:var(--sp-warning)">Spam</button>
							</form>
							<span>|</span>
							<form method="POST" action="?/trash" use:enhance style="display:inline">
								<input type="hidden" name="id" value={comment.id} />
								<button type="submit" class="sp-btn-link" style="color:var(--sp-danger)">Trash</button>
							</form>
							{#if comment.status === 'trash'}
								<span>|</span>
								<form method="POST" action="?/delete" use:enhance style="display:inline">
									<input type="hidden" name="id" value={comment.id} />
									<button type="submit" class="sp-btn-link" style="color:var(--sp-danger)" onclick={(e) => { if (!confirm('Delete permanently?')) e.preventDefault(); }}>Delete</button>
								</form>
							{/if}
						</div>

						<!-- Inline Reply -->
						{#if replyingTo === comment.id}
							<form method="POST" action="?/reply" use:enhance={() => { return async ({ update }) => { await update(); replyingTo = null; }; }} style="margin-top:12px;">
								<input type="hidden" name="parentId" value={comment.id} />
								<input type="hidden" name="postId" value={comment.postId} />
								<textarea
									name="content"
									class="sp-textarea"
									bind:value={replyContent}
									placeholder="Reply to this comment…"
									style="width:100%; min-height:80px; margin-bottom:8px;"
									required
								></textarea>
								<div style="display:flex; gap:8px;">
									<button type="submit" class="sp-btn sp-btn-primary sp-btn-sm">Submit Reply</button>
									<button type="button" class="sp-btn sp-btn-secondary sp-btn-sm" onclick={() => (replyingTo = null)}>Cancel</button>
								</div>
							</form>
						{/if}
					</td>
					<td>
						{#if comment.postTitle}
							<a href="/sp-admin/posts/{comment.postId}" style="font-size:13px; color:var(--sp-primary); text-decoration:none;">
								{truncate(comment.postTitle, 40)}
							</a>
							{#if comment.parentId}
								<div style="font-size:11px; color:var(--sp-text-muted); margin-top:2px;">in reply to #{comment.parentId}</div>
							{/if}
						{:else}
							<span style="color:var(--sp-text-muted);">—</span>
						{/if}
					</td>
					<td>
						<span style="font-size:12px; color:var(--sp-text-muted);">{formatDate(comment.date)}</span>
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
			{/if}
		{/each}
		{#if data.page < totalPages}
			<a href={buildUrl({ page: data.page + 1 })} class="sp-page-btn">Next &raquo;</a>
		{/if}
	</div>
{/if}
