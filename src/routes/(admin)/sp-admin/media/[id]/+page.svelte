<script lang="ts">
	import { enhance } from '$app/forms';
	import { bytesToHuman, getMediaUrl, formatDate } from '$lib/utils.js';

	let { data, form }: {
		data: {
			item: {
				id: number;
				filename: string;
				originalName: string;
				mimeType: string;
				size: number;
				width: number | null;
				height: number | null;
				alt: string;
				caption: string;
				description: string;
				path: string;
				sizes: Record<string, string>;
				uploadedAt: Date;
			};
		};
		form?: { success?: boolean; error?: string } | null;
	} = $props();

	let title = $state(data.item.originalName);
	let alt = $state(data.item.alt ?? '');
	let caption = $state(data.item.caption ?? '');
	let description = $state(data.item.description ?? '');
	let saving = $state(false);
	let copied = $state(false);

	const fileUrl = $derived(getMediaUrl(data.item.path));

	function copyUrl() {
		navigator.clipboard.writeText(window.location.origin + fileUrl);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<svelte:head>
	<title>{data.item.originalName} — Media — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Edit Media</h1>
	<a href="/sp-admin/media" class="sp-btn sp-btn-secondary">← Media Library</a>
</div>

{#if form?.error}
	<div class="sp-notice sp-notice-error">{form.error}</div>
{/if}
{#if form?.success}
	<div class="sp-notice sp-notice-success">Media updated successfully.</div>
{/if}

<div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start;">
	<!-- Left: Preview -->
	<div class="sp-card">
		<div class="sp-card-body">
			{#if data.item.mimeType.startsWith('image/')}
				<img
					src={fileUrl}
					alt={data.item.alt ?? data.item.originalName}
					style="max-width:100%; max-height:500px; object-fit:contain; display:block; margin:0 auto; border-radius:3px;"
				/>
			{:else if data.item.mimeType.startsWith('video/')}
				<video src={fileUrl} controls style="max-width:100%;"></video>
			{:else if data.item.mimeType.startsWith('audio/')}
				<audio src={fileUrl} controls style="width:100%;"></audio>
			{:else}
				<div style="text-align:center; padding:40px; font-size:64px;">📄</div>
			{/if}

			<div style="margin-top:16px; font-size:12px; color:var(--sp-text-muted); border-top:1px solid var(--sp-border); padding-top:12px;">
				<table style="width:100%; border-collapse:collapse;">
					<tbody>
						<tr>
							<td style="padding:4px 0; font-weight:600; width:120px;">File name:</td>
							<td style="padding:4px 0;">{data.item.filename}</td>
						</tr>
						<tr>
							<td style="padding:4px 0; font-weight:600;">File type:</td>
							<td style="padding:4px 0;">{data.item.mimeType}</td>
						</tr>
						<tr>
							<td style="padding:4px 0; font-weight:600;">File size:</td>
							<td style="padding:4px 0;">{bytesToHuman(data.item.size)}</td>
						</tr>
						{#if data.item.width && data.item.height}
							<tr>
								<td style="padding:4px 0; font-weight:600;">Dimensions:</td>
								<td style="padding:4px 0;">{data.item.width} × {data.item.height} px</td>
							</tr>
						{/if}
						<tr>
							<td style="padding:4px 0; font-weight:600;">Uploaded:</td>
							<td style="padding:4px 0;">{formatDate(data.item.uploadedAt)}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<!-- Right: Editable fields -->
	<div>
		<form method="POST" action="?/update" use:enhance={() => { saving = true; return async ({ update }) => { await update({ reset: false }); saving = false; }; }}>
			<div class="sp-card" style="margin-bottom:16px;">
				<div class="sp-card-body">
					<div class="sp-field">
						<label class="sp-label" for="title">Title</label>
						<input type="text" id="title" name="title" class="sp-input" bind:value={title} />
					</div>

					<div class="sp-field">
						<label class="sp-label" for="alt">Alternative Text</label>
						<input type="text" id="alt" name="alt" class="sp-input" bind:value={alt} placeholder="Describe the image for accessibility…" />
						<p style="font-size:12px; color:var(--sp-text-muted); margin-top:4px;">Leave empty if the image is purely decorative.</p>
					</div>

					<div class="sp-field">
						<label class="sp-label" for="caption">Caption</label>
						<textarea id="caption" name="caption" class="sp-textarea" bind:value={caption} style="min-height:60px;"></textarea>
					</div>

					<div class="sp-field">
						<label class="sp-label" for="description">Description</label>
						<textarea id="description" name="description" class="sp-textarea" bind:value={description} style="min-height:80px;"></textarea>
					</div>

					<div class="sp-field">
						<label class="sp-label">File URL</label>
						<div style="display:flex; gap:8px;">
							<input type="text" class="sp-input" value={window?.location?.origin + fileUrl} readonly style="flex:1;font-size:12px;" />
							<button type="button" class="sp-btn sp-btn-secondary sp-btn-sm" onclick={copyUrl}>
								{copied ? 'Copied!' : 'Copy URL'}
							</button>
						</div>
					</div>
				</div>
			</div>

			<div style="display:flex; justify-content:space-between; align-items:center;">
				<button type="submit" class="sp-btn sp-btn-primary" disabled={saving}>
					{saving ? 'Saving…' : 'Update'}
				</button>
			</div>
		</form>
		<div style="margin-top:12px;">
			<form method="POST" action="?/delete" use:enhance>
				<button
					type="submit"
					class="sp-btn sp-btn-danger"
					onclick={(e) => { if (!confirm('Permanently delete this file?')) e.preventDefault(); }}
				>Delete Permanently</button>
			</form>
		</div>
	</div>
</div>
