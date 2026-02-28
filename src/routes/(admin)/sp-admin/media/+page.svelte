<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { bytesToHuman, getMediaUrl, formatDate } from '$lib/utils.js';
	import { goto } from '$app/navigation';

	let { data, form } = $props<{
		data: {
			items: Array<{
				id: number;
				filename: string;
				originalName: string;
				mimeType: string;
				size: number;
				width: number | null;
				height: number | null;
				alt: string;
				caption: string;
				path: string;
				sizes: Record<string, string>;
				uploadedAt: Date;
				uploaderName: string | null;
			}>;
			total: number;
			page: number;
			perPage: number;
			search: string;
			mimeFilter: string;
			view: string;
			showUpload: boolean;
		};
		form?: { success?: boolean; error?: string; uploaded?: number[] } | null;
	}>();

	let view = $state(data.view);
	let search = $state(data.search);
	let mimeFilter = $state(data.mimeFilter);
	let selectedItem = $state<(typeof data.items)[0] | null>(null);
	let showUpload = $state(data.showUpload);
	let isDragOver = $state(false);
	let uploading = $state(false);
	let fileInput: HTMLInputElement;

	const totalPages = $derived(Math.ceil(data.total / data.perPage));

	function buildUrl(params: Record<string, string | number>) {
		const u = new URL(page.url);
		for (const [k, v] of Object.entries(params)) {
			if (v === '' || v === null || v === undefined) u.searchParams.delete(k);
			else u.searchParams.set(k, String(v));
		}
		return u.toString();
	}

	function thumbUrl(item: (typeof data.items)[0]) {
		if (item.sizes?.thumbnail) return getMediaUrl(item.sizes.thumbnail);
		if (item.mimeType.startsWith('image/')) return getMediaUrl(item.path);
		return null;
	}

	function mimeIcon(mimeType: string) {
		if (mimeType.startsWith('image/')) return '🖼️';
		if (mimeType.startsWith('video/')) return '🎬';
		if (mimeType.startsWith('audio/')) return '🎵';
		if (mimeType.includes('pdf')) return '📄';
		if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
		if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
		return '📁';
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
		const files = e.dataTransfer?.files;
		if (files?.length) {
			uploadFiles(files);
		}
	}

	async function uploadFiles(files: FileList) {
		uploading = true;
		const fd = new FormData();
		for (const f of files) fd.append('files', f);

		const resp = await fetch('?/upload', { method: 'POST', body: fd });
		uploading = false;
		if (resp.ok) {
			goto(page.url.pathname, { invalidateAll: true });
		}
	}
</script>

<svelte:head>
	<title>Media Library — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Media Library</h1>
	<div style="display:flex;gap:8px;">
		<button type="button" class="sp-btn sp-btn-primary" onclick={() => (showUpload = !showUpload)}>
			{showUpload ? 'Cancel Upload' : 'Add New'}
		</button>
	</div>
</div>

{#if form?.error}
	<div class="sp-notice sp-notice-error">{form.error}</div>
{/if}
{#if form?.success}
	<div class="sp-notice sp-notice-success">Upload successful!</div>
{/if}

<!-- Upload Zone -->
{#if showUpload}
	<div
		class="sp-upload-zone"
		class:drag-over={isDragOver}
		ondragover={(e) => { e.preventDefault(); isDragOver = true; }}
		ondragleave={() => (isDragOver = false)}
		ondrop={handleDrop}
		onclick={() => fileInput.click()}
		style="margin-bottom:20px; cursor:pointer;"
	>
		<input
			type="file"
			multiple
			accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
			style="display:none"
			bind:this={fileInput}
			onchange={(e) => { const files = (e.target as HTMLInputElement).files; if (files?.length) uploadFiles(files); }}
		/>
		{#if uploading}
			<div style="text-align:center; padding:40px;">
				<div style="font-size:18px; margin-bottom:8px;">Uploading…</div>
			</div>
		{:else}
			<div style="text-align:center; padding:40px;">
				<div style="font-size:48px; margin-bottom:12px;">📤</div>
				<p style="font-size:16px; font-weight:600; margin:0 0 6px;">Drop files here or click to upload</p>
				<p style="font-size:13px; color:var(--sp-text-muted); margin:0;">Supported: images, videos, audio, PDF, documents</p>
			</div>
		{/if}
	</div>
{/if}

<!-- Toolbar -->
<div style="display:flex; align-items:center; gap:10px; margin-bottom:16px; flex-wrap:wrap;">
	<!-- View toggle -->
	<div style="display:flex; border:1px solid var(--sp-border); border-radius:4px; overflow:hidden;">
		<a
			href={buildUrl({ view: 'grid', page: 1 })}
			class="sp-btn sp-btn-sm"
			style="border-radius:0; border:none; {view === 'grid' ? 'background:var(--sp-primary);color:#fff;' : ''}"
			title="Grid View"
		>
			<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="1" y="1" width="5" height="5"/><rect x="8" y="1" width="5" height="5"/><rect x="1" y="8" width="5" height="5"/><rect x="8" y="8" width="5" height="5"/></svg>
		</a>
		<a
			href={buildUrl({ view: 'list', page: 1 })}
			class="sp-btn sp-btn-sm"
			style="border-radius:0; border:none; {view === 'list' ? 'background:var(--sp-primary);color:#fff;' : ''}"
			title="List View"
		>
			<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="1" y="2" width="12" height="2"/><rect x="1" y="6" width="12" height="2"/><rect x="1" y="10" width="12" height="2"/></svg>
		</a>
	</div>

	<!-- Type filter -->
	<form method="GET" style="display:flex;gap:8px;align-items:center;">
		<input type="hidden" name="view" value={view} />
		<select class="sp-select" name="type" bind:value={mimeFilter} onchange={(e) => (e.target as HTMLSelectElement).form?.submit()}>
			<option value="">All media types</option>
			<option value="image/">Images</option>
			<option value="video/">Video</option>
			<option value="audio/">Audio</option>
			<option value="application/pdf">PDFs</option>
		</select>
	</form>

	<!-- Search -->
	<form method="GET" style="display:flex;gap:8px;margin-left:auto;">
		<input type="hidden" name="view" value={view} />
		<input type="hidden" name="type" value={mimeFilter} />
		<div class="sp-search-box">
			<input type="search" name="search" class="sp-search-input" placeholder="Search media…" bind:value={search} />
		</div>
		<button type="submit" class="sp-btn sp-btn-secondary sp-btn-sm">Search</button>
	</form>
</div>

<div style="display:flex; gap:20px; align-items:flex-start;">
	<!-- Main content -->
	<div style="flex:1; min-width:0;">
		{#if data.items.length === 0}
			<div style="text-align:center; padding:60px; color:var(--sp-text-muted);">
				<div style="font-size:48px; margin-bottom:16px;">🖼️</div>
				<p>No media found. <button type="button" class="sp-btn-link" onclick={() => (showUpload = true)}>Upload some files</button>.</p>
			</div>
		{:else if view === 'grid'}
			<div class="sp-media-grid">
				{#each data.items as item}
					{@const thumb = thumbUrl(item)}
					<div
						class="sp-media-thumb"
						class:selected={selectedItem?.id === item.id}
						onclick={() => selectedItem = selectedItem?.id === item.id ? null : item}
						title={item.originalName}
					>
						{#if thumb}
							<img src={thumb} alt={item.alt ?? item.originalName} loading="lazy" />
						{:else}
							<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:36px;">
								{mimeIcon(item.mimeType)}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="sp-table-wrap">
				<table class="sp-table">
					<thead>
						<tr>
							<th style="width:60px">File</th>
							<th>Name</th>
							<th>Type</th>
							<th>Size</th>
							<th>Dimensions</th>
							<th>Date</th>
						</tr>
					</thead>
					<tbody>
						{#each data.items as item}
							{@const thumb = thumbUrl(item)}
							<tr onclick={() => selectedItem = selectedItem?.id === item.id ? null : item} style="cursor:pointer;" class:active={selectedItem?.id === item.id}>
								<td>
									{#if thumb}
										<img src={thumb} alt={item.originalName} style="width:50px;height:50px;object-fit:cover;border-radius:3px;" />
									{:else}
										<span style="font-size:24px;">{mimeIcon(item.mimeType)}</span>
									{/if}
								</td>
								<td>
									<a href="/sp-admin/media/{item.id}" style="color:var(--sp-text);text-decoration:none;font-weight:500;">{item.originalName}</a>
									<div class="sp-row-actions">
										<a href="/sp-admin/media/{item.id}">Edit</a>
										<span>|</span>
										<a href={getMediaUrl(item.path)} target="_blank">View</a>
									</div>
								</td>
								<td style="font-size:12px;color:var(--sp-text-muted);">{item.mimeType}</td>
								<td style="font-size:12px;color:var(--sp-text-muted);">{bytesToHuman(item.size)}</td>
								<td style="font-size:12px;color:var(--sp-text-muted);">
									{#if item.width && item.height}{item.width} × {item.height}{:else}—{/if}
								</td>
								<td style="font-size:12px;color:var(--sp-text-muted);">{formatDate(item.uploadedAt)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="sp-pagination">
				{#if data.page > 1}
					<a href={buildUrl({ page: data.page - 1 })} class="sp-page-btn">&laquo;</a>
				{/if}
				{#each Array.from({ length: totalPages }, (_, i) => i + 1) as pg}
					{#if Math.abs(pg - data.page) <= 2 || pg === 1 || pg === totalPages}
						<a href={buildUrl({ page: pg })} class="sp-page-btn" class:active={pg === data.page}>{pg}</a>
					{/if}
				{/each}
				{#if data.page < totalPages}
					<a href={buildUrl({ page: data.page + 1 })} class="sp-page-btn">&raquo;</a>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Details sidebar -->
	{#if selectedItem}
		<div class="sp-card" style="width:280px; flex-shrink:0; position:sticky; top:72px;">
			<div class="sp-card-header" style="display:flex;align-items:center;justify-content:space-between;">
				<span class="sp-card-title" style="font-size:13px;">Attachment details</span>
				<button type="button" onclick={() => (selectedItem = null)} style="background:none;border:none;cursor:pointer;color:var(--sp-text-muted);font-size:18px;line-height:1;padding:0;">×</button>
			</div>
			<div class="sp-card-body" style="padding:12px;">
				{#if selectedItem.mimeType.startsWith('image/')}
					<img
						src={getMediaUrl(selectedItem.path)}
						alt={selectedItem.alt ?? selectedItem.originalName}
						style="width:100%;height:160px;object-fit:contain;background:#f0f0f1;border-radius:3px;margin-bottom:12px;"
					/>
				{:else}
					<div style="text-align:center;font-size:48px;margin-bottom:12px;">{mimeIcon(selectedItem.mimeType)}</div>
				{/if}
				<div style="font-size:12px; color:var(--sp-text-muted); margin-bottom:12px;">
					<div><strong>{selectedItem.originalName}</strong></div>
					<div>{formatDate(selectedItem.uploadedAt)}</div>
					<div>{bytesToHuman(selectedItem.size)}</div>
					{#if selectedItem.width && selectedItem.height}
						<div>{selectedItem.width} × {selectedItem.height} pixels</div>
					{/if}
				</div>
				<a href="/sp-admin/media/{selectedItem.id}" class="sp-btn sp-btn-primary sp-btn-sm" style="display:block;text-align:center;margin-bottom:8px;">Edit</a>
				<a href={getMediaUrl(selectedItem.path)} target="_blank" class="sp-btn sp-btn-secondary sp-btn-sm" style="display:block;text-align:center;">View</a>
			</div>
		</div>
	{/if}
</div>
