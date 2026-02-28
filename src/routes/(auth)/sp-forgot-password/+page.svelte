<script lang="ts">
	import { enhance } from '$app/forms';
	let { form } = $props<{ form?: { sent?: boolean; devToken?: string; email?: string; error?: string } | null }>();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Forgot Password — SveltePress</title>
</svelte:head>

<div class="sp-auth-wrap">
	<div class="sp-auth-bg"></div>

	<div class="sp-auth-card">
		<div class="sp-auth-header">
			<div class="sp-auth-logo">SP</div>
			<h1 class="sp-auth-title">Reset password</h1>
			<p class="sp-auth-subtitle">Enter your email to get a reset link</p>
		</div>

		<div class="sp-auth-body">
			{#if form?.sent}
				<div style="text-align:center; padding: 8px 0">
					<div style="font-size:32px; margin-bottom:12px">✉️</div>
					<p style="color: var(--sp-text); margin-bottom: 8px; font-weight: 600">Check your email</p>
					<p style="color: var(--sp-text-muted); font-size:13px; margin-bottom:16px">
						If an account exists for <strong>{form.email}</strong>, a reset link has been sent.
					</p>
					{#if form.devToken}
						<div style="background:#f0f7ff; border:1px solid #b3d4f5; border-radius:4px; padding:10px; font-size:11px; text-align:left;">
							<strong>Dev mode — reset token:</strong><br />
							<code style="word-break:break-all; font-size:10px">{form.devToken}</code>
						</div>
					{/if}
				</div>
			{:else}
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
