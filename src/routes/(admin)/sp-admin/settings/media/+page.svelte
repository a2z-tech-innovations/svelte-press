<script lang="ts">
	import { enhance } from '$app/forms';

	import type { PageData, ActionData } from './$types.js';
	let { data, form }: { data: PageData; form?: ActionData } = $props();

	const o = data.opts;
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Media Settings — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Media Settings</h1>
</div>

{#if form?.success}
	<div class="sp-notice sp-notice-success">Settings saved.</div>
{/if}

<form method="POST" action="?/save" use:enhance={() => { submitting = true; return async ({ update }) => { await update({ reset: false }); submitting = false; }; }}>
	<div class="sp-card" style="margin-bottom:16px;">
		<div class="sp-card-header"><h2 class="sp-card-title">Image Sizes</h2></div>
		<div class="sp-card-body">
			<p style="font-size:13px;color:var(--sp-text-muted);margin-bottom:16px;">
				The sizes listed below determine the maximum dimensions in pixels to use when inserting an image into the body of a post.
			</p>

			<table class="sp-settings-table">
				<tbody>
					<tr>
						<th><strong>Thumbnail Size</strong></th>
						<td>
							<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
								<div style="display:flex;align-items:center;gap:6px;">
									<label class="sp-label" style="margin:0;white-space:nowrap;">Width</label>
									<input type="number" name="thumbnail_size_w" class="sp-input" value={o['thumbnail_size_w'] ?? '150'} style="width:80px;" min="0" />
								</div>
								<div style="display:flex;align-items:center;gap:6px;">
									<label class="sp-label" style="margin:0;white-space:nowrap;">Height</label>
									<input type="number" name="thumbnail_size_h" class="sp-input" value={o['thumbnail_size_h'] ?? '150'} style="width:80px;" min="0" />
								</div>
								<label style="display:flex;align-items:center;gap:8px;font-size:13px;white-space:nowrap;">
									<input type="checkbox" name="thumbnail_crop" value="1" checked={o['thumbnail_crop'] !== '0'} />
									Crop thumbnail to exact dimensions
								</label>
							</div>
						</td>
					</tr>
					<tr>
						<th><strong>Medium Size</strong></th>
						<td>
							<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
								<div style="display:flex;align-items:center;gap:6px;">
									<label class="sp-label" style="margin:0;white-space:nowrap;">Max Width</label>
									<input type="number" name="medium_size_w" class="sp-input" value={o['medium_size_w'] ?? '300'} style="width:80px;" min="0" />
								</div>
								<div style="display:flex;align-items:center;gap:6px;">
									<label class="sp-label" style="margin:0;white-space:nowrap;">Max Height</label>
									<input type="number" name="medium_size_h" class="sp-input" value={o['medium_size_h'] ?? '300'} style="width:80px;" min="0" />
								</div>
							</div>
						</td>
					</tr>
					<tr>
						<th><strong>Large Size</strong></th>
						<td>
							<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
								<div style="display:flex;align-items:center;gap:6px;">
									<label class="sp-label" style="margin:0;white-space:nowrap;">Max Width</label>
									<input type="number" name="large_size_w" class="sp-input" value={o['large_size_w'] ?? '1024'} style="width:80px;" min="0" />
								</div>
								<div style="display:flex;align-items:center;gap:6px;">
									<label class="sp-label" style="margin:0;white-space:nowrap;">Max Height</label>
									<input type="number" name="large_size_h" class="sp-input" value={o['large_size_h'] ?? '1024'} style="width:80px;" min="0" />
								</div>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<p style="margin-top:4px;">
		<button type="submit" class="sp-btn sp-btn-primary" disabled={submitting}>
			{submitting ? 'Saving…' : 'Save Changes'}
		</button>
	</p>
</form>
