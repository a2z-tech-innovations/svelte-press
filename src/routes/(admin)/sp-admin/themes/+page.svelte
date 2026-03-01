<script lang="ts">
	import { enhance } from '$app/forms';

	import type { PageData, ActionData } from './$types.js';
	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let detailTheme = $state<(typeof data.themes)[0] | null>(null);
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Themes — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Themes</h1>
</div>

{#if form?.success}
	<div class="sp-notice sp-notice-success">Theme activated: <strong>{form.activated}</strong></div>
{/if}
{#if form?.error}
	<div class="sp-notice sp-notice-error">{form.error}</div>
{/if}

{#if data.themes.length === 0}
	<div class="sp-card">
		<div class="sp-card-body" style="text-align:center; padding:40px; color:var(--sp-text-muted);">
			<p>No themes found. Place theme folders in the <code>/themes</code> directory.</p>
		</div>
	</div>
{:else}
	<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:20px;">
		{#each data.themes as theme}
			<div
				style="border:2px solid {theme.active ? 'var(--sp-primary)' : 'var(--sp-border)'}; border-radius:6px; overflow:hidden; background:#fff; position:relative; transition: border-color 0.15s, box-shadow 0.15s;"
			>
				{#if theme.active}
					<div style="position:absolute;top:10px;right:10px;z-index:2;background:var(--sp-primary);color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">Active</div>
				{/if}

				<!-- Screenshot -->
				<div style="aspect-ratio:16/10;background:#f0f0f1;overflow:hidden;cursor:pointer;" onclick={() => (detailTheme = theme)}>
					{#if theme.screenshot}
						<img src={theme.screenshot} alt="{theme.name} screenshot" style="width:100%;height:100%;object-fit:cover;" />
					{:else}
						<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:48px;color:var(--sp-text-muted);">🎨</div>
					{/if}
				</div>

				<!-- Info -->
				<div style="padding:14px 16px;">
					<h3 style="font-size:14px;font-weight:600;margin:0 0 4px;">{theme.name}</h3>
					<p style="font-size:12px;color:var(--sp-text-muted);margin:0 0 8px;">Version {theme.version} by {theme.author}</p>
					{#if theme.description}
						<p style="font-size:12px;color:var(--sp-text-muted);margin:0 0 12px;line-height:1.5;">{theme.description}</p>
					{/if}
					<div style="display:flex;gap:8px;">
						{#if !theme.active}
							<form method="POST" action="?/activate" use:enhance={() => { submitting = true; return async ({ update }) => { await update(); submitting = false; }; }}>
								<input type="hidden" name="slug" value={theme.slug} />
								<button type="submit" class="sp-btn sp-btn-primary sp-btn-sm" disabled={submitting}>Activate</button>
							</form>
						{/if}
						<button type="button" class="sp-btn sp-btn-secondary sp-btn-sm" onclick={() => (detailTheme = theme)}>Theme Details</button>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}

<!-- Details Modal -->
{#if detailTheme}
	<div
		style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;"
		onclick={(e) => { if (e.target === e.currentTarget) detailTheme = null; }}
	>
		<div style="background:#fff;border-radius:8px;max-width:700px;width:100%;max-height:90vh;overflow-y:auto;position:relative;">
			<button
				type="button"
				onclick={() => (detailTheme = null)}
				style="position:absolute;top:12px;right:16px;background:none;border:none;cursor:pointer;font-size:24px;line-height:1;color:var(--sp-text-muted);z-index:1;"
			>×</button>

			{#if detailTheme.screenshot}
				<img src={detailTheme.screenshot} alt="{detailTheme.name} screenshot" style="width:100%;aspect-ratio:16/8;object-fit:cover;border-radius:8px 8px 0 0;" />
			{/if}

			<div style="padding:24px;">
				<h2 style="font-size:20px;font-weight:700;margin:0 0 6px;">{detailTheme.name}</h2>
				<p style="font-size:13px;color:var(--sp-text-muted);margin:0 0 16px;">Version {detailTheme.version} by {detailTheme.author}</p>
				{#if detailTheme.description}
					<p style="font-size:14px;margin:0 0 16px;line-height:1.6;">{detailTheme.description}</p>
				{/if}
				{#if !detailTheme.active}
					<form method="POST" action="?/activate" use:enhance={() => { submitting = true; return async ({ update }) => { await update(); submitting = false; detailTheme = null; }; }}>
						<input type="hidden" name="slug" value={detailTheme.slug} />
						<button type="submit" class="sp-btn sp-btn-primary" disabled={submitting}>Activate {detailTheme.name}</button>
					</form>
				{:else}
					<span style="font-size:13px;color:var(--sp-success);font-weight:600;">Currently Active Theme</span>
				{/if}
			</div>
		</div>
	</div>
{/if}
