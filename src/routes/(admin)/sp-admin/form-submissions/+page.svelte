<script lang="ts">
	import type { PageData, ActionData } from './$types.js';
	import { enhance } from '$app/forms';
	import { formatDate } from '$lib/utils.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let selectedIds = $state<number[]>([]);
	let bulkAction = $state('');

	function toggleAll(checked: boolean) {
		if (checked) {
			selectedIds = data.submissions.map((s) => s.id);
		} else {
			selectedIds = [];
		}
	}

	function toggleId(id: number, checked: boolean) {
		if (checked) {
			selectedIds = [...selectedIds, id];
		} else {
			selectedIds = selectedIds.filter((i) => i !== id);
		}
	}

	function getFirstFieldValue(sub: typeof data.submissions[number]): string {
		if (!sub.data || typeof sub.data !== 'object') return '—';
		const entries = Object.entries(sub.data as Record<string, unknown>);
		if (entries.length === 0) return '—';
		const val = entries[0][1];
		const str = String(val ?? '');
		return str.length > 60 ? str.slice(0, 60) + '…' : str || '—';
	}

	const statusLabels: Record<string, string> = {
		unread: 'Unread',
		read: 'Read',
		spam: 'Spam',
		trash: 'Trash'
	};

	const statusColors: Record<string, string> = {
		unread: 'sp-badge-blue',
		read: 'sp-badge-green',
		spam: 'sp-badge-yellow',
		trash: 'sp-badge-red'
	};
</script>

<div class="sp-page-header">
	<h1 class="sp-page-title">Form Submissions</h1>
	{#if data.allForms.length > 0}
		<a
			href="/api/v1/form-submissions?export=csv{data.formIdFilter ? '&form=' + data.formIdFilter : ''}"
			class="sp-btn sp-btn-secondary sp-btn-sm"
		>
			Export CSV
		</a>
	{/if}
</div>

{#if form?.error}
	<div class="sp-notice sp-notice-error" style="margin-bottom:16px">{form.error}</div>
{/if}

<!-- Status Tabs -->
<div class="sp-status-tabs" style="margin-bottom:16px">
	<a
		href="/sp-admin/form-submissions{data.formIdFilter ? '?form=' + data.formIdFilter : ''}"
		class="sp-status-tab"
		class:active={!data.statusFilter || data.statusFilter === 'all'}
	>
		All <span class="sp-count-badge">{data.counts.all ?? 0}</span>
	</a>
	<a
		href="/sp-admin/form-submissions?status=unread{data.formIdFilter ? '&form=' + data.formIdFilter : ''}"
		class="sp-status-tab"
		class:active={data.statusFilter === 'unread'}
	>
		Unread <span class="sp-count-badge warning">{data.counts.unread ?? 0}</span>
	</a>
	<a
		href="/sp-admin/form-submissions?status=read{data.formIdFilter ? '&form=' + data.formIdFilter : ''}"
		class="sp-status-tab"
		class:active={data.statusFilter === 'read'}
	>
		Read <span class="sp-count-badge">{data.counts.read ?? 0}</span>
	</a>
	<a
		href="/sp-admin/form-submissions?status=spam{data.formIdFilter ? '&form=' + data.formIdFilter : ''}"
		class="sp-status-tab"
		class:active={data.statusFilter === 'spam'}
	>
		Spam <span class="sp-count-badge">{data.counts.spam ?? 0}</span>
	</a>
	<a
		href="/sp-admin/form-submissions?status=trash{data.formIdFilter ? '&form=' + data.formIdFilter : ''}"
		class="sp-status-tab"
		class:active={data.statusFilter === 'trash'}
	>
		Trash <span class="sp-count-badge">{data.counts.trash ?? 0}</span>
	</a>
</div>

<!-- Filter bar -->
{#if data.allForms.length > 0}
	<div class="sp-filter-bar" style="margin-bottom:12px">
		<form method="GET" action="/sp-admin/form-submissions">
			{#if data.statusFilter}
				<input type="hidden" name="status" value={data.statusFilter} />
			{/if}
			<select name="form" class="sp-select sp-select-sm" onchange={(e) => (e.target as HTMLSelectElement).form?.submit()}>
				<option value="">All Forms</option>
				{#each data.allForms as f}
					<option value={f.id} selected={data.formIdFilter === f.id}>{f.title || 'Untitled Form'}</option>
				{/each}
			</select>
		</form>
	</div>
{/if}

<!-- Bulk Actions -->
<form method="POST" action="?/bulkAction" use:enhance>
	<div class="sp-bulk-bar" style="margin-bottom:12px; display:flex; gap:8px; align-items:center">
		<select name="bulkAction" class="sp-select sp-select-sm" bind:value={bulkAction}>
			<option value="">Bulk Actions</option>
			<option value="read">Mark Read</option>
			<option value="unread">Mark Unread</option>
			<option value="spam">Mark Spam</option>
			<option value="trash">Move to Trash</option>
			<option value="delete">Delete Permanently</option>
		</select>
		{#each selectedIds as id}
			<input type="hidden" name="ids" value={id} />
		{/each}
		<button type="submit" class="sp-btn sp-btn-secondary sp-btn-sm" disabled={selectedIds.length === 0 || !bulkAction}>
			Apply
		</button>
		{#if selectedIds.length > 0}
			<span class="sp-text-muted" style="font-size:0.8125rem">{selectedIds.length} selected</span>
		{/if}
	</div>

	<div class="sp-table-wrap">
		<table class="sp-table">
			<thead>
				<tr>
					<th style="width:32px">
						<input
							type="checkbox"
							onchange={(e) => toggleAll((e.target as HTMLInputElement).checked)}
							checked={selectedIds.length === data.submissions.length && data.submissions.length > 0}
						/>
					</th>
					<th>#</th>
					<th>Form</th>
					<th>Preview</th>
					<th>Date</th>
					<th>Status</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#if data.submissions.length === 0}
					<tr>
						<td colspan="7" style="text-align:center; padding:2rem; color:#646970">
							No submissions found.
						</td>
					</tr>
				{:else}
					{#each data.submissions as sub}
						<tr class:sp-row-unread={sub.status === 'unread'}>
							<td>
								<input
									type="checkbox"
									checked={selectedIds.includes(sub.id)}
									onchange={(e) => toggleId(sub.id, (e.target as HTMLInputElement).checked)}
								/>
							</td>
							<td>
								<a href="/sp-admin/form-submissions/{sub.id}" class="sp-link">#{sub.id}</a>
							</td>
							<td>{sub.formTitle ?? '—'}</td>
							<td style="max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#646970; font-size:0.875rem">
								{getFirstFieldValue(sub)}
							</td>
							<td style="white-space:nowrap; color:#646970; font-size:0.8125rem">
								{sub.createdAt ? formatDate(sub.createdAt) : '—'}
							</td>
							<td>
								<span class="sp-badge {statusColors[sub.status] ?? ''}">
									{statusLabels[sub.status] ?? sub.status}
								</span>
							</td>
							<td>
								<div class="sp-row-actions">
									<a href="/sp-admin/form-submissions/{sub.id}" class="sp-link">View</a>
									<form method="POST" action="?/delete" use:enhance style="display:inline">
										<input type="hidden" name="id" value={sub.id} />
										<button
											type="submit"
											class="sp-row-action-btn sp-row-action-danger"
											onclick={(e) => { if (!confirm('Delete this submission permanently?')) e.preventDefault(); }}
										>Delete</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</form>

<!-- Pagination -->
{#if data.totalPages > 1}
	<div class="sp-pagination" style="margin-top:16px; display:flex; gap:6px; align-items:center">
		{#if data.page > 1}
			<a
				href="/sp-admin/form-submissions?page={data.page - 1}{data.statusFilter ? '&status=' + data.statusFilter : ''}{data.formIdFilter ? '&form=' + data.formIdFilter : ''}"
				class="sp-btn sp-btn-secondary sp-btn-sm"
			>
				&larr; Previous
			</a>
		{/if}
		<span style="font-size:0.875rem; color:#646970">
			Page {data.page} of {data.totalPages}
		</span>
		{#if data.page < data.totalPages}
			<a
				href="/sp-admin/form-submissions?page={data.page + 1}{data.statusFilter ? '&status=' + data.statusFilter : ''}{data.formIdFilter ? '&form=' + data.formIdFilter : ''}"
				class="sp-btn sp-btn-secondary sp-btn-sm"
			>
				Next &rarr;
			</a>
		{/if}
	</div>
{/if}

<style>
	.sp-row-unread td {
		font-weight: 600;
	}

	.sp-badge {
		display: inline-block;
		padding: 2px 8px;
		border-radius: 3px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.sp-badge-blue {
		background: #dbeafe;
		color: #1e40af;
	}

	.sp-badge-green {
		background: #dcfce7;
		color: #166534;
	}

	.sp-badge-yellow {
		background: #fef9c3;
		color: #854d0e;
	}

	.sp-badge-red {
		background: #fee2e2;
		color: #991b1b;
	}

	.sp-row-action-btn {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font-size: 0.8125rem;
		font-family: inherit;
	}

	.sp-row-action-danger {
		color: #d63638;
	}

	.sp-row-action-danger:hover {
		text-decoration: underline;
	}

	.sp-link {
		color: #2271b1;
		text-decoration: none;
	}

	.sp-link:hover {
		text-decoration: underline;
	}

	.sp-filter-bar select {
		min-width: 160px;
	}
</style>
