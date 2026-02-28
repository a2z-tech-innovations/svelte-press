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
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let showPass = $state(false);
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
	<title>Profile — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Your Profile</h1>
</div>

{#if form?.error}
	<div class="sp-notice sp-notice-error">{form.error}</div>
{/if}
{#if form?.success}
	<div class="sp-notice sp-notice-success">Profile updated successfully.</div>
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

<form method="POST" action="?/save" use:enhance={() => { submitting = true; return async ({ update }) => { await update({ reset: false }); submitting = false; }; }} style="max-width:600px;">
	<!-- Identity display bar -->
	<div class="sp-card" style="margin-bottom:16px;">
		<div class="sp-card-body" style="display:flex;align-items:center;gap:16px;">
			<div style="width:48px;height:48px;border-radius:50%;background:var(--sp-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;flex-shrink:0;overflow:hidden;">
				{#if displayAvatarUrl}
					<img src={displayAvatarUrl} alt={data.user.displayName} style="width:100%;height:100%;object-fit:cover;" />
				{:else}
					{initials(data.user.displayName)}
				{/if}
			</div>
			<div>
				<div style="font-size:16px;font-weight:600;">{data.user.displayName}</div>
				<div style="font-size:13px;color:var(--sp-text-muted);">@{data.user.username} · {roles.find((r) => r.value === data.user.role)?.label ?? data.user.role}</div>
				<div style="font-size:12px;color:var(--sp-text-muted);">Member since {formatDate(data.user.registeredAt)}</div>
			</div>
		</div>
	</div>

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
							<p style="font-size:12px;color:var(--sp-text-muted);margin-top:4px;">Usernames cannot be changed.</p>
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
				</tbody>
			</table>
		</div>
	</div>

	<!-- About -->
	<div class="sp-card" style="margin-bottom:16px;">
		<div class="sp-card-header"><h2 class="sp-card-title">About Yourself</h2></div>
		<div class="sp-card-body">
			<table class="sp-settings-table">
				<tbody>
					<tr>
						<th><label class="sp-label" for="bio">Biographical Info</label></th>
						<td>
							<textarea id="bio" name="bio" class="sp-textarea" bind:value={bio} style="min-height:80px;"></textarea>
							<p style="font-size:12px;color:var(--sp-text-muted);margin-top:4px;">Share a little biographical information to fill out your profile.</p>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<!-- Password -->
	<div class="sp-card" style="margin-bottom:16px;">
		<div class="sp-card-header"><h2 class="sp-card-title">Change Password</h2></div>
		<div class="sp-card-body">
			<table class="sp-settings-table">
				<tbody>
					<tr>
						<th><label class="sp-label" for="currentPassword">Current Password</label></th>
						<td>
							<input
								type={showPass ? 'text' : 'password'}
								id="currentPassword"
								name="currentPassword"
								class="sp-input"
								bind:value={currentPassword}
								autocomplete="current-password"
								placeholder="Required only if changing password"
							/>
						</td>
					</tr>
					<tr>
						<th><label class="sp-label" for="newPassword">New Password</label></th>
						<td>
							<div style="display:flex;gap:8px;">
								<input
									type={showPass ? 'text' : 'password'}
									id="newPassword"
									name="newPassword"
									class="sp-input"
									bind:value={newPassword}
									autocomplete="new-password"
									placeholder="Leave blank to keep current"
									style="flex:1"
								/>
								<button type="button" class="sp-btn sp-btn-secondary sp-btn-sm" onclick={() => (showPass = !showPass)}>
									{showPass ? 'Hide' : 'Show'}
								</button>
							</div>
						</td>
					</tr>
					{#if newPassword}
						<tr>
							<th><label class="sp-label" for="confirmPassword">Confirm Password</label></th>
							<td>
								<input
									type={showPass ? 'text' : 'password'}
									id="confirmPassword"
									name="confirmPassword"
									class="sp-input"
									bind:value={confirmPassword}
									autocomplete="new-password"
									style="width:100%"
								/>
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<button type="submit" class="sp-btn sp-btn-primary" disabled={submitting}>
		{submitting ? 'Saving…' : 'Update Profile'}
	</button>
</form>
