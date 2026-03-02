<script lang="ts">
	import type { PageData, ActionData } from './$types.js';
	import { enhance } from '$app/forms';
	import { formatDate } from '$lib/utils.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let currentStatus = $state(data.submission.status);

	const statusLabels: Record<string, string> = {
		unread: 'Unread',
		read: 'Read',
		spam: 'Spam',
		trash: 'Trash'
	};

	const statusColors: Record<string, string> = {
		unread: 'color:#1e40af; background:#dbeafe',
		read: 'color:#166534; background:#dcfce7',
		spam: 'color:#854d0e; background:#fef9c3',
		trash: 'color:#991b1b; background:#fee2e2'
	};

	function getFieldValue(fieldId: string): string {
		if (!data.submission.data || typeof data.submission.data !== 'object') return '—';
		const val = (data.submission.data as Record<string, unknown>)[fieldId];
		return val !== undefined && val !== '' ? String(val) : '—';
	}
</script>

<div class="sp-page-header">
	<div>
		<div class="sp-breadcrumb" style="font-size:0.8125rem; color:#646970; margin-bottom:4px">
			<a href="/sp-admin/form-submissions" class="sp-breadcrumb-link">Form Submissions</a>
			<span style="margin:0 6px">/</span>
			<span>#{data.submission.id}</span>
		</div>
		<h1 class="sp-page-title">Submission #{data.submission.id}</h1>
	</div>
	<div style="display:flex; gap:8px; align-items:center">
		<a href="/sp-admin/form-submissions" class="sp-btn sp-btn-secondary sp-btn-sm">
			&larr; Back to List
		</a>
		<form method="POST" action="?/delete" use:enhance>
			<button
				type="submit"
				class="sp-btn sp-btn-danger sp-btn-sm"
				onclick={(e) => { if (!confirm('Delete this submission permanently?')) e.preventDefault(); }}
			>
				Delete
			</button>
		</form>
	</div>
</div>

{#if form?.success}
	<div class="sp-notice sp-notice-success" style="margin-bottom:16px">Status updated.</div>
{/if}

<div style="display:grid; grid-template-columns:1fr 280px; gap:24px; align-items:start">
	<!-- Main content: submission data -->
	<div class="sp-card">
		<div class="sp-card-header">
			<h2 class="sp-card-title">
				{data.submission.formTitle ?? 'Untitled Form'}
			</h2>
		</div>
		<div class="sp-card-body" style="padding:0">
			{#if data.submission.formFields.length > 0}
				<table class="sp-table sp-submission-table">
					<tbody>
						{#each data.submission.formFields.filter(f => f.type !== 'hidden') as field}
							<tr>
								<th style="width:200px; padding:12px 16px; text-align:left; font-weight:500; background:#f9f9f9; border-bottom:1px solid #e8e8e8; vertical-align:top">
									{field.label}
								</th>
								<td style="padding:12px 16px; border-bottom:1px solid #e8e8e8; word-break:break-word">
									{getFieldValue(field.id)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<!-- Fallback: show raw data -->
				<table class="sp-table sp-submission-table">
					<tbody>
						{#each Object.entries((data.submission.data as Record<string, unknown>) ?? {}).filter(([k]) => !k.startsWith('_')) as [key, val]}
							<tr>
								<th style="width:200px; padding:12px 16px; text-align:left; font-weight:500; background:#f9f9f9; border-bottom:1px solid #e8e8e8; vertical-align:top">
									{key}
								</th>
								<td style="padding:12px 16px; border-bottom:1px solid #e8e8e8; word-break:break-word">
									{String(val ?? '—')}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	</div>

	<!-- Sidebar: metadata + status -->
	<div style="display:flex; flex-direction:column; gap:16px">
		<!-- Status card -->
		<div class="sp-card">
			<div class="sp-card-header">
				<h2 class="sp-card-title">Status</h2>
			</div>
			<div class="sp-card-body">
				<div style="margin-bottom:12px">
					<span class="sp-badge-pill" style="padding:4px 10px; border-radius:12px; font-size:0.8125rem; font-weight:500; {statusColors[currentStatus] ?? ''}">
						{statusLabels[currentStatus] ?? currentStatus}
					</span>
				</div>
				<form method="POST" action="?/updateStatus" use:enhance>
					<div class="sp-field" style="margin-bottom:8px">
						<select
							name="status"
							class="sp-select"
							bind:value={currentStatus}
						>
							<option value="unread">Unread</option>
							<option value="read">Read</option>
							<option value="spam">Spam</option>
							<option value="trash">Trash</option>
						</select>
					</div>
					<button type="submit" class="sp-btn sp-btn-secondary sp-btn-sm">Update Status</button>
				</form>
			</div>
		</div>

		<!-- Metadata card -->
		<div class="sp-card">
			<div class="sp-card-header">
				<h2 class="sp-card-title">Details</h2>
			</div>
			<div class="sp-card-body">
				<dl class="sp-detail-list">
					<dt>Submitted</dt>
					<dd>{data.submission.createdAt ? formatDate(data.submission.createdAt) : '—'}</dd>

					{#if data.submission.ipAddress}
						<dt>IP Address</dt>
						<dd style="font-family:monospace; font-size:0.8125rem">{data.submission.ipAddress}</dd>
					{/if}

					{#if data.submission.userAgent}
						<dt>User Agent</dt>
						<dd style="font-size:0.75rem; color:#646970; word-break:break-all">{data.submission.userAgent}</dd>
					{/if}
				</dl>
			</div>
		</div>
	</div>
</div>

<style>
	.sp-breadcrumb-link {
		color: #2271b1;
		text-decoration: none;
	}

	.sp-breadcrumb-link:hover {
		text-decoration: underline;
	}

	.sp-submission-table {
		width: 100%;
		border-collapse: collapse;
	}

	.sp-detail-list {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 6px 12px;
		font-size: 0.875rem;
		margin: 0;
	}

	.sp-detail-list dt {
		color: #646970;
		font-weight: 500;
		white-space: nowrap;
	}

	.sp-detail-list dd {
		color: #1d2327;
		margin: 0;
	}
</style>
