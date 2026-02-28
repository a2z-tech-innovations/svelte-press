<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { initials, formatDate } from '$lib/utils.js';

	let { data, form } = $props<{
		data: {
			users: Array<{
				id: number;
				username: string;
				email: string;
				displayName: string;
				role: string;
				avatar: string;
				registeredAt: Date;
				lastLogin: Date | null;
				postCount: number;
			}>;
			roleCounts: Record<string, number>;
			roleFilter: string;
			currentUserId: number;
		};
		form?: { success?: boolean; error?: string } | null;
	}>();

	const roles = [
		{ key: '', label: 'All' },
		{ key: 'admin', label: 'Administrator' },
		{ key: 'editor', label: 'Editor' },
		{ key: 'author', label: 'Author' },
		{ key: 'contributor', label: 'Contributor' },
		{ key: 'subscriber', label: 'Subscriber' }
	];

	function buildUrl(params: Record<string, string>) {
		const u = new URL(page.url);
		for (const [k, v] of Object.entries(params)) {
			if (!v) u.searchParams.delete(k);
			else u.searchParams.set(k, v);
		}
		return u.toString();
	}

	function roleLabel(role: string) {
		return roles.find((r) => r.key === role)?.label ?? role;
	}
</script>

<svelte:head>
	<title>Users — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Users</h1>
	<a href="/sp-admin/users/new" class="sp-btn sp-btn-primary">Add New User</a>
</div>

{#if form?.error}
	<div class="sp-notice sp-notice-error">{form.error}</div>
{/if}
{#if form?.success}
	<div class="sp-notice sp-notice-success">User deleted successfully.</div>
{/if}

<!-- Role Tabs -->
<div class="sp-status-tabs">
	{#each roles as role}
		<a
			href={buildUrl({ role: role.key })}
			class="sp-status-tab"
			class:active={data.roleFilter === role.key}
		>
			{role.label}
			{#if data.roleCounts[role.key || 'all']}
				<span class="sp-count-badge">{data.roleCounts[role.key || 'all']}</span>
			{/if}
		</a>
	{/each}
</div>

<!-- Table -->
<div class="sp-table-wrap">
	<table class="sp-table">
		<thead>
			<tr>
				<th style="width:200px">Username</th>
				<th>Email</th>
				<th style="width:120px">Role</th>
				<th style="width:60px; text-align:center;">Posts</th>
				<th style="width:140px">Registered</th>
			</tr>
		</thead>
		<tbody>
			{#if data.users.length === 0}
				<tr>
					<td colspan="5" style="text-align:center; color:var(--sp-text-muted); padding:32px;">No users found.</td>
				</tr>
			{/if}
			{#each data.users as user}
				<tr>
					<td>
						<div style="display:flex; align-items:center; gap:10px;">
							<div style="width:36px;height:36px;border-radius:50%;background:var(--sp-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0;overflow:hidden;">
								{#if user.avatar}
									<img src={user.avatar} alt={user.displayName} style="width:100%;height:100%;object-fit:cover;" />
								{:else}
									{initials(user.displayName)}
								{/if}
							</div>
							<div>
								<a href="/sp-admin/users/{user.id}" style="font-weight:600; color:var(--sp-text); text-decoration:none; font-size:13px;">
									{user.displayName}
								</a>
								<div style="font-size:11px; color:var(--sp-text-muted);">@{user.username}</div>
								<div class="sp-row-actions">
									<a href="/sp-admin/users/{user.id}">Edit</a>
									{#if user.id !== data.currentUserId}
										<span>|</span>
										<form method="POST" action="?/delete" use:enhance style="display:inline">
											<input type="hidden" name="id" value={user.id} />
											<button
												type="submit"
												class="sp-btn-link"
												style="color:var(--sp-danger)"
												onclick={(e) => { if (!confirm(`Delete user ${user.displayName}?`)) e.preventDefault(); }}
											>Delete</button>
										</form>
									{/if}
								</div>
							</div>
						</div>
					</td>
					<td style="font-size:13px;"><a href="mailto:{user.email}" style="color:var(--sp-text-muted);text-decoration:none;">{user.email}</a></td>
					<td>
						<span style="font-size:12px; text-transform:capitalize; color:var(--sp-text-muted);">{roleLabel(user.role)}</span>
					</td>
					<td style="text-align:center;">
						<a href="/sp-admin/posts?author={user.id}" style="font-size:13px; color:var(--sp-primary); text-decoration:none;">
							{user.postCount}
						</a>
					</td>
					<td style="font-size:12px; color:var(--sp-text-muted);">{formatDate(user.registeredAt)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
