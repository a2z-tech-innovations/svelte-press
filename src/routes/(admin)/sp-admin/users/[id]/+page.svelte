<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate, initials } from '$lib/utils.js';
	import type { PageData, ActionData } from './$types.js';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

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
	let avatarSubmitting = $state(false);

	// Preview selected avatar file before upload
	let avatarPreviewUrl = $state<string | null>(null);

	function handleAvatarFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			avatarPreviewUrl = URL.createObjectURL(file);
		} else {
			avatarPreviewUrl = null;
		}
	}

	const displayAvatarUrl = $derived(
		avatarPreviewUrl ?? data.customAvatarUrl ?? data.user.avatar ?? null
	);

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

<!-- Avatar Upload Card (separate form) -->
<div class="sp-card" style="margin-bottom:16px;max-width:600px;">
	<div class="sp-card-header"><h2 class="sp-card-title">Profile Picture</h2></div>
	<div class="sp-card-body">
		{#if form?.avatarError}
			<div class="sp-notice sp-notice-error" style="margin-bottom:12px;">{form.avatarError}</div>
		{/if}
		{#if form?.avatarSuccess}
			<div class="sp-notice sp-notice-success" style="margin-bottom:12px;">Avatar updated successfully.</div>
		{/if}
		<div style="display:flex;align-items:flex-start;gap:20px;flex-wrap:wrap;">
			<!-- Current avatar preview -->
			<div style="width:96px;height:96px;border-radius:50%;background:var(--sp-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;flex-shrink:0;overflow:hidden;border:2px solid var(--sp-border);">
				{#if displayAvatarUrl}
					<img src={displayAvatarUrl} alt={data.user.displayName} style="width:100%;height:100%;object-fit:cover;" />
				{:else}
					{initials(data.user.displayName)}
				{/if}
			</div>
			<div style="flex:1;min-width:200px;">
				<form
					method="POST"
					action="?/uploadAvatar"
					enctype="multipart/form-data"
					use:enhance={() => {
						avatarSubmitting = true;
						return async ({ update }) => {
							await update({ reset: false });
							avatarSubmitting = false;
							avatarPreviewUrl = null;
						};
					}}
				>
					<div style="margin-bottom:10px;">
						<label class="sp-label" for="avatar" style="display:block;margin-bottom:6px;">Upload new avatar</label>
						<input
							type="file"
							id="avatar"
							name="avatar"
							accept="image/*"
							class="sp-input"
							style="padding:4px;"
							onchange={handleAvatarFileChange}
						/>
						<p style="font-size:12px;color:var(--sp-text-muted);margin-top:4px;">
							JPG, PNG, GIF or WebP. Max 2MB. Will be cropped to 96×96.
						</p>
					</div>
					<button type="submit" class="sp-btn sp-btn-secondary sp-btn-sm" disabled={avatarSubmitting}>
						{avatarSubmitting ? 'Uploading…' : 'Change Avatar'}
					</button>
				</form>
				{#if data.customAvatarUrl}
					<p style="font-size:12px;color:var(--sp-text-muted);margin-top:8px;">Custom avatar is active.</p>
				{:else}
					<p style="font-size:12px;color:var(--sp-text-muted);margin-top:8px;">No custom avatar — using default.</p>
				{/if}
			</div>
		</div>
	</div>
</div>

<form method="POST" action="?/default" use:enhance={() => { submitting = true; return async ({ update }) => { await update({ reset: false }); submitting = false; }; }} style="max-width:600px;">
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
