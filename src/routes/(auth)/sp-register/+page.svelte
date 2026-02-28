<script lang="ts">
	import { enhance } from '$app/forms';

	interface FormData {
		username?: string;
		email?: string;
		displayName?: string;
		errors?: Record<string, string>;
	}
	let { data, form } = $props<{ data: { canRegister: boolean }; form?: FormData | null }>();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Register — SveltePress</title>
</svelte:head>

<div class="sp-auth-wrap">
	<div class="sp-auth-bg"></div>

	<div class="sp-auth-card" style="max-width: 400px">
		<div class="sp-auth-header">
			<div class="sp-auth-logo">SP</div>
			<h1 class="sp-auth-title">Create account</h1>
			<p class="sp-auth-subtitle">Join SveltePress</p>
		</div>

		<div class="sp-auth-body">
			{#if !data.canRegister}
				<div class="sp-auth-error">
					User registration is currently disabled. Please contact the administrator.
				</div>
				<a href="/sp-login" class="sp-auth-submit" style="text-align:center;display:block;text-decoration:none;">
					Back to Login
				</a>
			{:else}
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
							value={form?.username ?? ''}
							required
							autofocus
						/>
						{#if form?.errors?.username}
							<div class="sp-error-text" style="margin-top:4px">{form.errors.username}</div>
						{/if}
					</div>

					<div class="sp-auth-field">
						<label class="sp-auth-label" for="email">Email</label>
						<input
							id="email"
							name="email"
							type="email"
							class="sp-auth-input"
							value={form?.email ?? ''}
							required
						/>
						{#if form?.errors?.email}
							<div class="sp-error-text" style="margin-top:4px">{form.errors.email}</div>
						{/if}
					</div>

					<div class="sp-auth-field">
						<label class="sp-auth-label" for="displayName">Display Name</label>
						<input
							id="displayName"
							name="displayName"
							type="text"
							class="sp-auth-input"
							value={form?.displayName ?? ''}
						/>
					</div>

					<div class="sp-auth-field">
						<label class="sp-auth-label" for="password">Password</label>
						<input
							id="password"
							name="password"
							type="password"
							class="sp-auth-input"
							autocomplete="new-password"
							required
						/>
						{#if form?.errors?.password}
							<div class="sp-error-text" style="margin-top:4px">{form.errors.password}</div>
						{/if}
					</div>

					<div class="sp-auth-field">
						<label class="sp-auth-label" for="confirmPassword">Confirm Password</label>
						<input
							id="confirmPassword"
							name="confirmPassword"
							type="password"
							class="sp-auth-input"
							autocomplete="new-password"
							required
						/>
						{#if form?.errors?.confirmPassword}
							<div class="sp-error-text" style="margin-top:4px">{form.errors.confirmPassword}</div>
						{/if}
					</div>

					<button type="submit" class="sp-auth-submit" disabled={loading}>
						{loading ? 'Creating account…' : 'Create Account'}
					</button>
				</form>
			{/if}
		</div>

		<div class="sp-auth-footer">
			<span style="color: var(--sp-text-muted)">Already have an account?</span>
			<a href="/sp-login" class="sp-auth-link">Sign in</a>
		</div>
	</div>
</div>
