<script lang="ts">
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	// Filter state — synced from URL params
	let filterAction = $state(data.filter);
	let filterType = $state(data.objectType);

	function formatAction(action: string): string {
		return action
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (c) => c.toUpperCase());
	}

	function actionColor(action: string): string {
		if (action.includes('login') || action.includes('logout')) return '#00a32a';
		if (action.includes('publish')) return '#2271b1';
		if (action.includes('delete') || action.includes('trash')) return '#d63638';
		if (action.includes('plugin')) return '#8b44b0';
		if (action.includes('settings')) return '#646970';
		if (action.includes('media')) return '#b26200';
		if (action.includes('comment')) return '#135e96';
		return '#646970';
	}

	function formatDate(ts: Date | null): string {
		if (!ts) return '—';
		const d = new Date(ts);
		return d.toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	const totalPages = $derived(Math.ceil(data.total / data.perPage));

	function buildUrl(newPage: number, action?: string, type?: string): string {
		const params = new URLSearchParams();
		if (newPage > 1) params.set('page', String(newPage));
		const a = action ?? filterAction;
		const t = type ?? filterType;
		if (a) params.set('action', a);
		if (t) params.set('type', t);
		const qs = params.toString();
		return `/sp-admin/activity${qs ? '?' + qs : ''}`;
	}

	function applyFilter() {
		window.location.href = buildUrl(1, filterAction, filterType);
	}

	function clearFilter() {
		filterAction = '';
		filterType = '';
		window.location.href = '/sp-admin/activity';
	}

	// Known action types for the quick-filter buttons
	const actionGroups = [
		{ label: 'Login', value: 'user_login' },
		{ label: 'Posts', value: 'post_' },
		{ label: 'Comments', value: 'comment_' },
		{ label: 'Media', value: 'media_' },
		{ label: 'Plugins', value: 'plugin_' },
		{ label: 'Settings', value: 'settings_' }
	];
</script>

<div class="sp-page-header">
	<h1 class="sp-page-title">Activity Log</h1>
</div>

<!-- Filter bar -->
<div class="sp-card" style="margin-bottom: 16px;">
	<div class="sp-card-body" style="padding: 12px 16px;">
		<div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
			<input
				class="sp-input"
				type="text"
				placeholder="Filter by action..."
				style="width: 220px;"
				bind:value={filterAction}
				onkeydown={(e) => { if (e.key === 'Enter') applyFilter(); }}
			/>
			<select class="sp-select" style="width: 160px;" bind:value={filterType}>
				<option value="">All object types</option>
				<option value="post">Post</option>
				<option value="page">Page</option>
				<option value="comment">Comment</option>
				<option value="media">Media</option>
				<option value="user">User</option>
				<option value="plugin">Plugin</option>
				<option value="settings">Settings</option>
			</select>
			<button class="sp-btn sp-btn-primary sp-btn-sm" onclick={applyFilter}>Filter</button>
			{#if data.filter || data.objectType}
				<button class="sp-btn sp-btn-secondary sp-btn-sm" onclick={clearFilter}>Clear</button>
			{/if}
			<div style="margin-left: auto; display: flex; gap: 6px; flex-wrap: wrap;">
				{#each actionGroups as group}
					<a
						href={buildUrl(1, group.value, '')}
						class="sp-btn sp-btn-secondary sp-btn-sm"
						style={data.filter === group.value ? 'font-weight: 600; background: var(--sp-primary); color: #fff;' : ''}
					>
						{group.label}
					</a>
				{/each}
			</div>
		</div>
	</div>
</div>

<!-- Stats summary -->
<p style="color: var(--sp-text-muted); font-size: 13px; margin-bottom: 12px;">
	{data.total} {data.total === 1 ? 'entry' : 'entries'} found
	{#if data.filter || data.objectType}
		&mdash; filtered
	{/if}
</p>

<!-- Log table -->
{#if data.logs.length === 0}
	<div class="sp-card">
		<div class="sp-card-body" style="text-align: center; padding: 48px; color: var(--sp-text-muted);">
			No activity recorded yet.
		</div>
	</div>
{:else}
	<div class="sp-table-wrap">
		<table class="sp-table">
			<thead>
				<tr>
					<th style="width: 170px;">Date / Time</th>
					<th style="width: 130px;">User</th>
					<th style="width: 180px;">Action</th>
					<th>Object</th>
					<th style="width: 200px;">Details</th>
					<th style="width: 110px;">IP</th>
				</tr>
			</thead>
			<tbody>
				{#each data.logs as log}
					<tr>
						<td style="font-size: 12px; color: var(--sp-text-muted); white-space: nowrap;">
							{formatDate(log.createdAt)}
						</td>
						<td style="font-size: 13px;">
							{#if log.userDisplayName}
								<span title="User ID: {log.userId ?? ''}">{log.userDisplayName}</span>
							{:else}
								<span style="color: var(--sp-text-muted);">—</span>
							{/if}
						</td>
						<td>
							<span style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px;">
								<span
									style="
										display: inline-block;
										width: 8px; height: 8px;
										border-radius: 50%;
										background: {actionColor(log.action)};
										flex-shrink: 0;
									"
								></span>
								{formatAction(log.action)}
							</span>
						</td>
						<td style="font-size: 13px;">
							{#if log.objectTitle || log.objectType}
								<span style="color: var(--sp-text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">
									{log.objectType ?? ''}
								</span>
								{#if log.objectTitle}
									<br />
									<span title="ID: {log.objectId ?? ''}">{log.objectTitle}</span>
								{/if}
							{:else}
								<span style="color: var(--sp-text-muted);">—</span>
							{/if}
						</td>
						<td style="font-size: 12px; color: var(--sp-text-muted); word-break: break-all;">
							{#if log.details}
								{@const parsed = (() => { try { return JSON.parse(log.details); } catch { return null; } })()}
								{#if parsed}
									{#each Object.entries(parsed) as [k, v]}
										<span style="display: block;">
											<strong>{k}:</strong>
											{typeof v === 'object' ? JSON.stringify(v) : String(v)}
										</span>
									{/each}
								{:else}
									{log.details}
								{/if}
							{:else}
								—
							{/if}
						</td>
						<td style="font-size: 12px; color: var(--sp-text-muted);">
							{log.ip ?? '—'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Pagination -->
	{#if totalPages > 1}
		<div style="display: flex; gap: 4px; margin-top: 16px; align-items: center; flex-wrap: wrap;">
			{#if data.page > 1}
				<a href={buildUrl(data.page - 1)} class="sp-btn sp-btn-secondary sp-btn-sm">&laquo; Prev</a>
			{/if}

			{#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
				{#if p === 1 || p === totalPages || Math.abs(p - data.page) <= 2}
					<a
						href={buildUrl(p)}
						class="sp-btn sp-btn-sm"
						class:sp-btn-primary={p === data.page}
						class:sp-btn-secondary={p !== data.page}
					>
						{p}
					</a>
				{:else if Math.abs(p - data.page) === 3}
					<span style="padding: 0 4px; color: var(--sp-text-muted);">...</span>
				{/if}
			{/each}

			{#if data.page < totalPages}
				<a href={buildUrl(data.page + 1)} class="sp-btn sp-btn-secondary sp-btn-sm">Next &raquo;</a>
			{/if}

			<span style="margin-left: 8px; font-size: 13px; color: var(--sp-text-muted);">
				Page {data.page} of {totalPages} ({data.total} total)
			</span>
		</div>
	{/if}
{/if}
