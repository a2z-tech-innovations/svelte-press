<script lang="ts">
	let {
		open = $bindable(false),
		onselect
	}: {
		open: boolean;
		onselect: (url: string, alt: string) => void;
	} = $props();

	let activeTab = $state<'upload' | 'library'>('upload');
	let uploading = $state(false);
	let uploadError = $state('');
	let mediaItems = $state<Array<{ id: number; url: string; alt: string; originalName: string }>>([]);
	let loadingMedia = $state(false);

	async function loadMedia() {
		loadingMedia = true;
		try {
			const res = await fetch('/api/v1/media?type=image&perPage=48');
			const data = await res.json();
			mediaItems = (data.items ?? []).map((m: Record<string, unknown>) => ({
				id: m.id,
				url: m.url as string,
				alt: m.alt as string,
				originalName: m.originalName as string
			}));
		} catch {
			// ignore
		} finally {
			loadingMedia = false;
		}
	}

	$effect(() => {
		if (open && activeTab === 'library') {
			loadMedia();
		}
	});

	async function handleUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		uploading = true;
		uploadError = '';
		try {
			const formData = new FormData();
			formData.append('file', file);
			const res = await fetch('/api/upload', { method: 'POST', body: formData });
			const data = await res.json();
			if (data.url) {
				onselect(data.url as string, (data.alt as string) ?? '');
				open = false;
			} else {
				uploadError = data.error ?? 'Upload failed.';
			}
		} catch {
			uploadError = 'Upload failed.';
		} finally {
			uploading = false;
			input.value = '';
		}
	}

	function selectFromLibrary(url: string, alt: string) {
		onselect(url, alt);
		open = false;
	}

	function close() {
		open = false;
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="sp-dialog-backdrop" onclick={close}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="sp-dialog" onclick={(e) => e.stopPropagation()}>
			<div class="sp-dialog-header">
				<h3 class="sp-dialog-title">Insert Image</h3>
				<button type="button" class="sp-dialog-close" onclick={close} aria-label="Close">×</button>
			</div>

			<div class="sp-dialog-tabs">
				<button
					type="button"
					class="sp-dialog-tab"
					class:active={activeTab === 'upload'}
					onclick={() => (activeTab = 'upload')}
				>Upload</button>
				<button
					type="button"
					class="sp-dialog-tab"
					class:active={activeTab === 'library'}
					onclick={() => { activeTab = 'library'; loadMedia(); }}
				>Media Library</button>
			</div>

			<div class="sp-dialog-body">
				{#if activeTab === 'upload'}
					<div class="sp-upload-zone">
						<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
						<p>Choose an image to upload</p>
						<label class="sp-btn sp-btn-primary" style="cursor:pointer;margin-top:8px;">
							{uploading ? 'Uploading…' : 'Choose File'}
							<input
								type="file"
								accept="image/*"
								style="display:none;"
								onchange={handleUpload}
								disabled={uploading}
							/>
						</label>
						{#if uploadError}
							<p class="sp-error-text" style="margin-top:8px;">{uploadError}</p>
						{/if}
					</div>
				{:else}
					{#if loadingMedia}
						<div style="text-align:center;padding:40px;color:var(--sp-text-muted,#646970);">Loading…</div>
					{:else if mediaItems.length === 0}
						<div style="text-align:center;padding:40px;color:var(--sp-text-muted,#646970);">No images in library.</div>
					{:else}
						<div class="sp-media-grid">
							{#each mediaItems as item (item.id)}
								<button
									type="button"
									class="sp-media-thumb-btn"
									onclick={() => selectFromLibrary(item.url, item.alt)}
									title={item.originalName}
								>
									<img src={item.url} alt={item.alt || item.originalName} loading="lazy" />
								</button>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.sp-dialog-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.5);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.sp-dialog {
		background: #fff;
		border-radius: 6px;
		width: 680px;
		max-width: 95vw;
		max-height: 85vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 8px 32px rgba(0,0,0,0.2);
	}

	.sp-dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--sp-border, #c3c4c7);
	}

	.sp-dialog-title {
		font-size: 16px;
		font-weight: 600;
		margin: 0;
	}

	.sp-dialog-close {
		background: none;
		border: none;
		font-size: 22px;
		line-height: 1;
		cursor: pointer;
		color: var(--sp-text-muted, #646970);
		padding: 0 4px;
	}

	.sp-dialog-close:hover {
		color: var(--sp-text, #1d2327);
	}

	.sp-dialog-tabs {
		display: flex;
		border-bottom: 1px solid var(--sp-border, #c3c4c7);
		padding: 0 20px;
	}

	.sp-dialog-tab {
		padding: 10px 16px;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		font-size: 13px;
		color: var(--sp-text-muted, #646970);
		font-family: inherit;
		margin-bottom: -1px;
	}

	.sp-dialog-tab.active {
		border-bottom-color: var(--sp-primary, #2271b1);
		color: var(--sp-primary, #2271b1);
		font-weight: 500;
	}

	.sp-dialog-body {
		padding: 20px;
		overflow-y: auto;
		flex: 1;
	}

	.sp-upload-zone {
		min-height: 200px;
		border: 2px dashed var(--sp-border, #c3c4c7);
		border-radius: 6px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		color: var(--sp-text-muted, #646970);
		font-size: 14px;
	}

	.sp-media-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 8px;
	}

	.sp-media-thumb-btn {
		aspect-ratio: 1;
		border: 2px solid transparent;
		border-radius: 4px;
		padding: 0;
		cursor: pointer;
		overflow: hidden;
		background: #f6f7f7;
		transition: border-color 0.15s;
	}

	.sp-media-thumb-btn:hover {
		border-color: var(--sp-primary, #2271b1);
	}

	.sp-media-thumb-btn img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.sp-error-text {
		color: var(--sp-error, #d63638);
		font-size: 13px;
	}
</style>
