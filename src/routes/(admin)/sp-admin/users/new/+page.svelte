<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props<{
		form?: { error?: string } | null;
	}>();

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
	<title>Add New User — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Add New User</h1>
</div>

{#if form?.error}
	<div class="sp-notice sp-notice-error">{form.error}</div>
{/if}

<form method="POST" use:enhance={() => { submitting = true; return async ({ update }) => { await update(); submitting = false; }; }} style="max-width:600px;">
	<div class="sp-card">
		<div class="sp-card-header">
			<h2 class="sp-card-title">User Details</h2>
		</div>
		<div class="sp-card-body">
			<table class="sp-settings-table">
				<tbody>
					<tr>
						<th><label class="sp-label" for="username">Username <span style="color:var(--sp-danger)">*</span></label></th>
						<td><input type="text" id="username" name="username" class="sp-input" required autocomplete="off" /></td>
					</tr>
					<tr>
						<th><label class="sp-label" for="email">Email <span style="color:var(--sp-danger)">*</span></label></th>
						<td><input type="email" id="email" name="email" class="sp-input" required /></td>
					</tr>
					<tr>
						<th><label class="sp-label" for="firstName">First Name</label></th>
						<td><input type="text" id="firstName" name="firstName" class="sp-input" /></td>
					</tr>
					<tr>
						<th><label class="sp-label" for="lastName">Last Name</label></th>
						<td><input type="text" id="lastName" name="lastName" class="sp-input" /></td>
					</tr>
					<tr>
						<th><label class="sp-label" for="website">Website</label></th>
						<td><input type="url" id="website" name="website" class="sp-input" placeholder="https://" /></td>
					</tr>
					<tr>
						<th><label class="sp-label" for="role">Role</label></th>
						<td>
							<select id="role" name="role" class="sp-select">
								{#each roles as r}
									<option value={r.value} selected={r.value === 'subscriber'}>{r.label}</option>
								{/each}
							</select>
						</td>
					</tr>
					<tr>
						<th><label class="sp-label" for="password">Password <span style="color:var(--sp-danger)">*</span></label></th>
						<td>
							<div style="display:flex; gap:8px; align-items:center;">
								<input
									type={showPassword ? 'text' : 'password'}
									id="password"
									name="password"
									class="sp-input"
									required
									autocomplete="new-password"
									style="flex:1"
								/>
								<button type="button" class="sp-btn sp-btn-secondary sp-btn-sm" onclick={() => (showPassword = !showPassword)}>
									{showPassword ? 'Hide' : 'Show'}
								</button>
							</div>
							<p style="font-size:12px; color:var(--sp-text-muted); margin-top:4px;">Use a strong password with at least 8 characters.</p>
						</td>
					</tr>
					<tr>
						<th></th>
						<td>
							<label style="display:flex; align-items:center; gap:8px; font-size:13px;">
								<input type="checkbox" name="sendNotification" value="1" />
								Send the new user an email about their account
							</label>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<div style="margin-top:16px;">
		<button type="submit" class="sp-btn sp-btn-primary" disabled={submitting}>
			{submitting ? 'Adding User…' : 'Add New User'}
		</button>
		<a href="/sp-admin/users" class="sp-btn sp-btn-secondary" style="margin-left:8px;">Cancel</a>
	</div>
</form>
