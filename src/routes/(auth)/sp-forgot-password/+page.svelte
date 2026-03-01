<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	let {
		form,
		data
	}: {
		form?: {
			sent?: boolean;
			devToken?: string;
			email?: string;
			error?: string;
			resetError?: string;
		} | null;
		data: { sent: boolean; devToken: string; token: string | null };
	} = $props();

	let loading = $state(false);

	// If a token is present in the URL, show the "set new password" form
	const hasToken = $derived(!!data.token || !!page.url.searchParams.get('token'));
	const resetToken = $derived(data.token ?? page.url.searchParams.get('token') ?? '');
</script>

<svelte:head>
	<title>Reset Password — SveltePress</title>
</svelte:head>

<div class="sp-auth-wrap">
	<div class="sp-auth-bg"></div>

	<div class="sp-auth-card">
		<div class="sp-auth-header">
			<div class="sp-auth-logo">SP</div>
			{#if hasToken}
				<h1 class="sp-auth-title">Set new password</h1>
				<p class="sp-auth-subtitle">Enter your new password below</p>
			{:else}
				<h1 class="sp-auth-title">Reset password</h1>
				<p class="sp-auth-subtitle">Enter your email to get a reset link</p>
			{/if}
		</div>

		<div class="sp-auth-body">
			{#if hasToken}
				<!-- Step 2: set new password using the reset token from the URL -->
				{#if form?.resetError}
					<div class="sp-auth-error">{form.resetError}</div>
				{/if}

				<form
					method="POST"
					action="?/resetPassword"
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							await update();
							loading = false;
						};
					}}
				>
					<input type="hidden" name="token" value={resetToken} />

					<div class="sp-auth-field">
						<label class="sp-auth-label" for="newPassword">New Password</label>
						<input
							id="newPassword"
							name="newPassword"
							type="password"
							class="sp-auth-input"
							minlength="8"
							autocomplete="new-password"
							required
							autofocus
						/>
					</div>

					<div class="sp-auth-field">
						<label class="sp-auth-label" for="confirmPassword">Confirm Password</label>
						<input
							id="confirmPassword"
							name="confirmPassword"
							type="password"
							class="sp-auth-input"
							minlength="8"
							autocomplete="new-password"
							required
						/>
					</div>

					<button type="submit" class="sp-auth-submit" disabled={loading}>
						{loading ? 'Saving…' : 'Set New Password'}
					</button>
				</form>
			{:else if form?.sent}
				<!-- Step 1 success: email sent -->
				<div style="text-align:center; padding: 8px 0">
					<div style="font-size:32px; margin-bottom:12px">✉️</div>
					<p style="color: var(--sp-text); margin-bottom: 8px; font-weight: 600">Check your email</p>
					<p style="color: var(--sp-text-muted); font-size:13px; margin-bottom:16px">
						If an account exists for <strong>{form.email}</strong>, a reset link has been sent.
					</p>
					{#if form.devToken}
						<div style="background:#f0f7ff; border:1px solid #b3d4f5; border-radius:4px; padding:10px; font-size:11px; text-align:left;">
							{#if form.devToken.startsWith('http')}
								<strong>Dev mode — email preview:</strong><br />
								<a
									href={form.devToken}
									target="_blank"
									rel="noopener noreferrer"
									style="word-break:break-all; font-size:10px">{form.devToken}</a
								>
							{:else}
								<strong>Dev mode — reset token:</strong><br />
								<code style="word-break:break-all; font-size:10px">{form.devToken}</code>
							{/if}
						</div>
					{/if}
				</div>
			{:else}
				<!-- Step 1: enter email -->
				{#if form?.error}
					<div class="sp-auth-error">{form.error}</div>
				{/if}

				<form
					method="POST"
					action="?/requestReset"
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							await update();
							loading = false;
						};
					}}
				>
					<div class="sp-auth-field">
						<label class="sp-auth-label" for="email">Email Address</label>
						<input
							id="email"
							name="email"
							type="email"
							class="sp-auth-input"
							required
							autofocus
							placeholder="you@example.com"
						/>
					</div>

					<button type="submit" class="sp-auth-submit" disabled={loading}>
						{loading ? 'Sending…' : 'Send Reset Link'}
					</button>
				</form>
			{/if}
		</div>

		<div class="sp-auth-footer">
			<a href="/sp-login" class="sp-auth-link">← Back to login</a>
		</div>
	</div>
</div>
