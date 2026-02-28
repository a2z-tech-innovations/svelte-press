<script lang="ts">
	import { enhance } from '$app/forms';

	import type { PageData, ActionData } from './$types.js';
	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let submitting = $state<string | null>(null);
</script>

<svelte:head>
	<title>Plugins — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Plugins</h1>
</div>

{#if form?.success}
	<div class="sp-notice sp-notice-success">Plugin {form.action}: <strong>{form.slug}</strong></div>
{/if}
{#if form?.error}
	<div class="sp-notice sp-notice-error">{form.error}</div>
{/if}

{#if data.plugins.length === 0}
	<div class="sp-card">
		<div class="sp-card-body" style="text-align:center; padding:40px; color:var(--sp-text-muted);">
			<p>No plugins found. Place plugin folders in the <code>/plugins</code> directory with a <code>plugin.json</code> manifest.</p>
		</div>
	</div>
{:else}
	<div class="sp-table-wrap">
		<table class="sp-table">
			<thead>
				<tr>
					<th style="width:36px"></th>
					<th>Plugin</th>
					<th style="width:100px">Version</th>
					<th>Author</th>
					<th style="width:140px">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each data.plugins as plugin}
					<tr style={plugin.active ? 'background:#f0f9ff;' : ''}>
						<td>
							<div style="width:12px;height:12px;border-radius:50%;background:{plugin.active ? 'var(--sp-success)' : '#ccc'};"></div>
						</td>
						<td>
							<div>
								<strong style="font-size:14px;">{plugin.name}</strong>
								{#if plugin.active}
									<span style="font-size:11px;background:#dff0d8;color:#3c763d;border-radius:3px;padding:1px 6px;margin-left:6px;">Active</span>
								{/if}
								{#if plugin.description}
									<p style="font-size:12px;color:var(--sp-text-muted);margin:4px 0 0;">{plugin.description}</p>
								{/if}
							</div>
						</td>
						<td style="font-size:13px;color:var(--sp-text-muted);">{plugin.version}</td>
						<td style="font-size:13px;color:var(--sp-text-muted);">{plugin.author}</td>
						<td>
							<form method="POST" action="?/toggle" use:enhance={() => { submitting = plugin.slug; return async ({ update }) => { await update(); submitting = null; }; }}>
								<input type="hidden" name="slug" value={plugin.slug} />
								<input type="hidden" name="activate" value={plugin.active ? '0' : '1'} />
								<button
									type="submit"
									class="sp-btn sp-btn-sm {plugin.active ? 'sp-btn-secondary' : 'sp-btn-primary'}"
									disabled={submitting === plugin.slug}
								>
									{submitting === plugin.slug ? '…' : plugin.active ? 'Deactivate' : 'Activate'}
								</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
