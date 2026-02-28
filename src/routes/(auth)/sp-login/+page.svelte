<script lang="ts">
	import { enhance } from '$app/forms';
	let { form } = $props<{ form?: { error?: string; username?: string } | null }>();
	let loading = $state(false);
	let username = $state(form?.username ?? '');
</script>

<svelte:head>
	<title>Log In — SveltePress</title>
</svelte:head>

<div class="sp-auth-wrap">
	<div class="sp-auth-bg"></div>

	<div class="sp-auth-card">
		<div class="sp-auth-header">
			<div class="sp-auth-logo">SP</div>
			<h1 class="sp-auth-title">Welcome back</h1>
			<p class="sp-auth-subtitle">Sign in to SveltePress</p>
		</div>

		<div class="sp-auth-body">
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
		</div>

		<div class="sp-auth-footer">
			<span style="color: var(--sp-text-muted)">Don't have an account?</span>
			<a href="/sp-register" class="sp-auth-link">Register</a>
		</div>
	</div>
</div>
