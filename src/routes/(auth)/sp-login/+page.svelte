<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	let { form }: { form?: { error?: string; username?: string; twoFactorError?: string } | null } =
		$props();

	let loading = $state(false);
	let username = $state(form?.username ?? '');

	const is2faStep = $derived(page.url.searchParams.get('step') === '2fa');
</script>

<svelte:head>
	<title>Log In — SveltePress</title>
</svelte:head>

<div class="sp-auth-wrap">
	<div class="sp-auth-bg"></div>

	<div class="sp-auth-card">
		<div class="sp-auth-header">
			<div class="sp-auth-logo">SP</div>
			{#if is2faStep}
				<h1 class="sp-auth-title">Two-Factor Authentication</h1>
				<p class="sp-auth-subtitle">Enter the code from your authenticator app</p>
			{:else}
				<h1 class="sp-auth-title">Welcome back</h1>
				<p class="sp-auth-subtitle">Sign in to SveltePress</p>
			{/if}
		</div>

		<div class="sp-auth-body">
			{#if is2faStep}
				<!-- 2FA verification step -->
				{#if form?.twoFactorError}
					<div class="sp-auth-error">{form.twoFactorError}</div>
				{/if}

				<form
					method="POST"
					action="?/verify2faLogin"
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							await update();
							loading = false;
						};
					}}
				>
					<div class="sp-auth-field">
						<label class="sp-auth-label" for="code">Authentication Code</label>
						<input
							id="code"
							name="code"
							type="text"
							class="sp-auth-input"
							inputmode="numeric"
							pattern="\d{6}|\w{10}"
							maxlength="10"
							autocomplete="one-time-code"
							required
							autofocus
							placeholder="000000"
							style="letter-spacing: 0.15em; text-align: center; font-size: 1.25rem;"
						/>
					</div>

					<p style="font-size: 12px; color: var(--sp-text-muted); margin-bottom: 16px; text-align: center;">
						Enter a 6-digit code from your authenticator app, or a 10-character backup code.
					</p>

					<button type="submit" class="sp-auth-submit" disabled={loading}>
						{loading ? 'Verifying…' : 'Verify'}
					</button>
				</form>

				<div style="text-align: center; margin-top: 16px;">
					<a href="/sp-login" class="sp-auth-link" style="font-size: 13px;">
						Back to login
					</a>
				</div>
			{:else}
				<!-- Normal login step -->
				{#if form?.error}
					<div class="sp-auth-error">{form.error}</div>
				{/if}

				<form
					method="POST"
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							await update();
							loading = false;
						};
					}}
				>
					<div class="sp-auth-field">
						<label class="sp-auth-label" for="username">Username</label>
						<input
							id="username"
							name="username"
							type="text"
							class="sp-auth-input"
							bind:value={username}
							autocomplete="username"
							required
							autofocus
						/>
					</div>

					<div class="sp-auth-field">
						<label class="sp-auth-label" for="password">Password</label>
						<input
							id="password"
							name="password"
							type="password"
							class="sp-auth-input"
							autocomplete="current-password"
							required
						/>
					</div>

					<div class="sp-auth-options">
						<label class="sp-auth-check">
							<input type="checkbox" name="remember" />
							Remember me
						</label>
						<a href="/sp-forgot-password" class="sp-auth-link">Forgot password?</a>
					</div>

					<button type="submit" class="sp-auth-submit" disabled={loading}>
						{loading ? 'Signing in…' : 'Sign In'}
					</button>
				</form>
			{/if}
		</div>

		{#if !is2faStep}
			<div class="sp-auth-footer">
				<span style="color: var(--sp-text-muted)">Don't have an account?</span>
				<a href="/sp-register" class="sp-auth-link">Register</a>
			</div>
		{/if}
	</div>
</div>
