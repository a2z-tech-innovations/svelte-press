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

	// 2FA state
	let totpEnabled = $state(data.totpEnabled);
	let show2faSetup = $state(false);
	let showDisableForm = $state(false);
	let twoFaSubmitting = $state(false);

	// When setup2fa succeeds, form.setup2fa holds the QR data
	let setupData = $derived(
		form && 'setup2fa' in form && form.setup2fa ? form.setup2fa : null
	);

	// When verify2fa succeeds, form.totpEnabled is true and form.backupCodes has the codes
	let backupCodes = $derived(
		form && 'backupCodes' in form && Array.isArray(form.backupCodes) ? form.backupCodes : null
	);

	// When 2FA is newly enabled, show the enabled state
	$effect(() => {
		if (form && 'totpEnabled' in form && form.totpEnabled) {
			totpEnabled = true;
			show2faSetup = false;
		}
		if (form && 'totpDisabled' in form && form.totpDisabled) {
			totpEnabled = false;
			showDisableForm = false;
		}
	});

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
						<th><label class="sp-label" for="profile-username">Username</label></th>
						<td>
							<input id="profile-username" type="text" class="sp-input" value={data.user.username} readonly style="background:#f6f7f7;" />
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

<!-- Two-Factor Authentication card (outside main form) -->
<div class="sp-card" style="margin-top:24px;max-width:600px;">
	<div class="sp-card-header">
		<h2 class="sp-card-title">Two-Factor Authentication</h2>
	</div>
	<div class="sp-card-body">

		{#if form?.totpError}
			<div class="sp-notice sp-notice-error" style="margin-bottom:16px;">{form.totpError}</div>
		{/if}
		{#if form?.disableError}
			<div class="sp-notice sp-notice-error" style="margin-bottom:16px;">{form.disableError}</div>
		{/if}

		{#if totpEnabled && backupCodes}
			<!-- Just enabled — show backup codes once -->
			<div class="sp-notice sp-notice-success" style="margin-bottom:16px;">
				Two-factor authentication has been enabled successfully.
			</div>
			<div style="margin-bottom:16px;">
				<p style="font-weight:600;margin-bottom:8px;">Save your backup codes</p>
				<p style="font-size:13px;color:var(--sp-text-muted);margin-bottom:12px;">
					These codes can be used to sign in if you lose access to your authenticator app.
					Each code can only be used once. Store them somewhere safe — they will not be shown again.
				</p>
				<div style="background:#f0f0f1;border:1px solid var(--sp-border);border-radius:4px;padding:16px;font-family:monospace;font-size:14px;">
					{#each backupCodes as code}
						<div style="margin-bottom:4px;">{code}</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if totpEnabled && !backupCodes}
			<!-- 2FA is active -->
			<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
				<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;background:var(--sp-success);border-radius:50%;color:#fff;font-size:12px;font-weight:700;">✓</span>
				<span style="font-weight:600;color:var(--sp-success);">Two-factor authentication is enabled</span>
			</div>
			<p style="font-size:13px;color:var(--sp-text-muted);margin-bottom:16px;">
				Your account is protected with TOTP two-factor authentication. You will be asked for a code from your authenticator app each time you log in.
			</p>

			{#if !showDisableForm}
				<button
					type="button"
					class="sp-btn sp-btn-danger sp-btn-sm"
					onclick={() => { showDisableForm = true; }}
				>
					Disable 2FA
				</button>
			{:else}
				<form
					method="POST"
					action="?/disable2fa"
					use:enhance={() => {
						twoFaSubmitting = true;
						return async ({ update }) => {
							await update({ reset: false });
							twoFaSubmitting = false;
						};
					}}
				>
					<p style="font-size:13px;font-weight:600;margin-bottom:12px;">Confirm to disable two-factor authentication:</p>
					<div class="sp-field" style="margin-bottom:12px;">
						<label class="sp-label" for="disablePassword">Current Password</label>
						<input
							type="password"
							id="disablePassword"
							name="disablePassword"
							class="sp-input"
							autocomplete="current-password"
							required
							placeholder="Your account password"
						/>
					</div>
					<div class="sp-field" style="margin-bottom:16px;">
						<label class="sp-label" for="disableCode">Authentication Code</label>
						<input
							type="text"
							id="disableCode"
							name="disableCode"
							class="sp-input"
							inputmode="numeric"
							maxlength="10"
							autocomplete="one-time-code"
							required
							placeholder="6-digit code or backup code"
						/>
					</div>
					<div style="display:flex;gap:8px;">
						<button type="submit" class="sp-btn sp-btn-danger sp-btn-sm" disabled={twoFaSubmitting}>
							{twoFaSubmitting ? 'Disabling…' : 'Confirm Disable'}
						</button>
						<button
							type="button"
							class="sp-btn sp-btn-secondary sp-btn-sm"
							onclick={() => { showDisableForm = false; }}
						>
							Cancel
						</button>
					</div>
				</form>
			{/if}

		{:else if !totpEnabled}
			<!-- 2FA is not enabled -->
			<p style="font-size:13px;color:var(--sp-text-muted);margin-bottom:16px;">
				Two-factor authentication adds an extra layer of security to your account. When enabled, you will need to enter a code from your authenticator app (such as Google Authenticator or Authy) each time you log in.
			</p>

			{#if !show2faSetup && !setupData}
				<form
					method="POST"
					action="?/setup2fa"
					use:enhance={() => {
						twoFaSubmitting = true;
						return async ({ update }) => {
							await update({ reset: false });
							twoFaSubmitting = false;
							show2faSetup = true;
						};
					}}
				>
					<button type="submit" class="sp-btn sp-btn-primary" disabled={twoFaSubmitting}>
						{twoFaSubmitting ? 'Generating…' : 'Enable Two-Factor Authentication'}
					</button>
				</form>
			{/if}

			{#if setupData}
				<!-- QR code setup step -->
				<div style="margin-bottom:20px;">
					<p style="font-weight:600;margin-bottom:8px;">Step 1: Scan the QR code</p>
					<p style="font-size:13px;color:var(--sp-text-muted);margin-bottom:12px;">
						Open your authenticator app (Google Authenticator, Authy, 1Password, etc.) and scan this QR code.
					</p>
					<div style="display:inline-block;padding:12px;background:#fff;border:1px solid var(--sp-border);border-radius:4px;margin-bottom:12px;">
						<img src={setupData.qrDataUrl} alt="TOTP QR Code" width="200" height="200" />
					</div>
					<p style="font-size:12px;color:var(--sp-text-muted);margin-bottom:4px;">
						Can't scan the QR code? Enter this secret manually:
					</p>
					<code style="display:block;background:#f0f0f1;border:1px solid var(--sp-border);border-radius:4px;padding:8px 12px;font-size:13px;font-family:monospace;word-break:break-all;margin-bottom:20px;">
						{setupData.secretBase32}
					</code>

					<p style="font-weight:600;margin-bottom:8px;">Step 2: Verify the code</p>
					<p style="font-size:13px;color:var(--sp-text-muted);margin-bottom:12px;">
						Enter the 6-digit code from your authenticator app to confirm setup.
					</p>

					<form
						method="POST"
						action="?/verify2fa"
						use:enhance={() => {
							twoFaSubmitting = true;
							return async ({ update }) => {
								await update({ reset: false });
								twoFaSubmitting = false;
							};
						}}
					>
						<div style="display:flex;gap:8px;align-items:flex-end;max-width:280px;">
							<div class="sp-field" style="flex:1;margin-bottom:0;">
								<label class="sp-label" for="verifyCode">Verification Code</label>
								<input
									type="text"
									id="verifyCode"
									name="code"
									class="sp-input"
									inputmode="numeric"
									pattern="\d{6}"
									maxlength="6"
									required
									autofocus
									placeholder="000000"
									style="letter-spacing:0.15em;text-align:center;font-size:1.1rem;"
								/>
							</div>
							<button type="submit" class="sp-btn sp-btn-primary" disabled={twoFaSubmitting} style="margin-bottom:0;flex-shrink:0;">
								{twoFaSubmitting ? 'Verifying…' : 'Verify & Enable'}
							</button>
						</div>
					</form>

					<div style="margin-top:12px;">
						<form
							method="POST"
							action="?/setup2fa"
							use:enhance={() => {
								twoFaSubmitting = true;
								return async ({ update }) => {
									await update({ reset: false });
									twoFaSubmitting = false;
								};
							}}
						>
							<button type="submit" class="sp-btn sp-btn-secondary sp-btn-sm" disabled={twoFaSubmitting}>
								Generate new QR code
							</button>
						</form>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>
