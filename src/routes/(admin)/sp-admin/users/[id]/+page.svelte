<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate } from '$lib/utils.js';

	let { data, form } = $props<{
		data: {
			user: {
				id: number;
				username: string;
				email: string;
				displayName: string;
				bio: string;
				avatar: string;
				role: string;
				registeredAt: Date;
				lastLogin: Date | null;
			};
		};
		form?: { success?: boolean; error?: string } | null;
	}>();

	const nameParts = data.user.displayName?.split(' ') ?? [];
	let firstName = $state(nameParts[0] ?? '');
	let lastName = $state(nameParts.slice(1).join(' ') ?? '');
	let email = $state(data.user.email);
	let bio = $state(data.user.bio ?? '');
	let role = $state(data.user.role);
	let password = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let submitting = $state(false);

	const roles = [
		{ value: 'subscriber', label: 'Subscriber' },
		{ value: 'contributor', label: 'Contributor' },
		{ value: 'author', label: 'Author' },
		{ value: 'editor', label: 'Editor' },
		{ value: 'admin', label: 'Administrator' }
	];
</script>

<svelte:head>
	<title>Edit User: {data.user.displayName} — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Edit User</h1>
	<a href="/sp-admin/users" class="sp-btn sp-btn-secondary">← All Users</a>
</div>

{#if form?.error}
	<div class="sp-notice sp-notice-error">{form.error}</div>
{/if}
{#if form?.success}
	<div class="sp-notice sp-notice-success">User updated.</div>
{/if}

<form method="POST" use:enhance={() => { submitting = true; return async ({ update }) => { await update({ reset: false }); submitting = false; }; }} style="max-width:600px;">
	<!-- Name -->
	<div class="sp-card" style="margin-bottom:16px;">
		<div class="sp-card-header"><h2 class="sp-card-title">Name</h2></div>
		<div class="sp-card-body">
			<table class="sp-settings-table">
				<tbody>
					<tr>
						<th><label class="sp-label">Username</label></th>
						<td>
							<input type="text" class="sp-input" value={data.user.username} readonly style="background:#f6f7f7;" />
							<p style="font-size:12px; color:var(--sp-text-muted); margin-top:4px;">Usernames cannot be changed.</p>
						</td>
					</tr>
					<tr>
						<th><label class="sp-label" for="firstName">First Name</label></th>
						<td><input type="text" id="firstName" name="firstName" class="sp-input" bind:value={firstName} /></td>
					</tr>
					<tr>
						<th><label class="sp-label" for="lastName">Last Name</label></th>
						<td><input type="text" id="lastName" name="lastName" class="sp-input" bind:value={lastName} /></td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<!-- Contact Info -->
	<div class="sp-card" style="margin-bottom:16px;">
		<div class="sp-card-header"><h2 class="sp-card-title">Contact Info</h2></div>
		<div class="sp-card-body">
			<table class="sp-settings-table">
				<tbody>
					<tr>
						<th><label class="sp-label" for="email">Email <span style="color:var(--sp-danger)">*</span></label></th>
						<td><input type="email" id="email" name="email" class="sp-input" bind:value={email} required /></td>
					</tr>
					<tr>
						<th><label class="sp-label" for="website">Website</label></th>
						<td><input type="url" id="website" name="website" class="sp-input" value={data.user.avatar ?? ''} placeholder="https://" /></td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<!-- About -->
	<div class="sp-card" style="margin-bottom:16px;">
		<div class="sp-card-header"><h2 class="sp-card-title">About the User</h2></div>
		<div class="sp-card-body">
			<table class="sp-settings-table">
				<tbody>
					<tr>
						<th><label class="sp-label" for="bio">Biographical Info</label></th>
						<td>
							<textarea id="bio" name="bio" class="sp-textarea" bind:value={bio} style="min-height:80px;"></textarea>
							<p style="font-size:12px; color:var(--sp-text-muted); margin-top:4px;">Share a little biographical information to fill out your profile.</p>
						</td>
					</tr>
					<tr>
						<th><label class="sp-label" for="role">Role</label></th>
						<td>
							<select id="role" name="role" class="sp-select" bind:value={role}>
								{#each roles as r}
									<option value={r.value}>{r.label}</option>
								{/each}
							</select>
						</td>
					</tr>
				</tbody>
			</table>
			<div style="font-size:12px; color:var(--sp-text-muted); margin-top:12px; border-top:1px solid var(--sp-border); padding-top:12px;">
				Registered: {formatDate(data.user.registeredAt)}
				{#if data.user.lastLogin}
					· Last login: {formatDate(data.user.lastLogin)}
				{/if}
			</div>
		</div>
	</div>

	<!-- Password -->
	<div class="sp-card" style="margin-bottom:16px;">
		<div class="sp-card-header"><h2 class="sp-card-title">Account Management</h2></div>
		<div class="sp-card-body">
			<table class="sp-settings-table">
				<tbody>
					<tr>
						<th><label class="sp-label" for="password">New Password</label></th>
						<td>
							<div style="display:flex; gap:8px;">
								<input
									type={showPassword ? 'text' : 'password'}
									id="password"
									name="password"
									class="sp-input"
									bind:value={password}
									autocomplete="new-password"
									placeholder="Leave blank to keep current"
									style="flex:1"
								/>
								<button type="button" class="sp-btn sp-btn-secondary sp-btn-sm" onclick={() => (showPassword = !showPassword)}>
									{showPassword ? 'Hide' : 'Show'}
								</button>
							</div>
						</td>
					</tr>
					{#if password}
						<tr>
							<th><label class="sp-label" for="confirmPassword">Confirm Password</label></th>
							<td>
								<input
									type={showPassword ? 'text' : 'password'}
									id="confirmPassword"
									name="confirmPassword"
									class="sp-input"
									bind:value={confirmPassword}
									autocomplete="new-password"
									placeholder="Confirm new password"
								/>
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<button type="submit" class="sp-btn sp-btn-primary" disabled={submitting}>
		{submitting ? 'Saving…' : 'Update User'}
	</button>
</form>
