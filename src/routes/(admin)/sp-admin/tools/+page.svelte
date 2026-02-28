<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { PageData, ActionData } from './$types.js';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	const activeTab = $derived((page.url.searchParams.get('tab') ?? 'export') as 'export' | 'import');

	let contentType = $state('all');
	let exporting = $state(false);
	let importing = $state(false);
</script>

<svelte:head>
	<title>Tools — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Tools</h1>
</div>

<!-- Tab navigation -->
<div class="sp-status-tabs" style="margin-bottom:20px;">
	<a
		href="?tab=export"
		class="sp-status-tab"
		class:active={activeTab === 'export'}
	>Export</a>
	<a
		href="?tab=import"
		class="sp-status-tab"
		class:active={activeTab === 'import'}
	>Import</a>
</div>

{#if activeTab === 'export'}
	<!-- Export Tab -->
	<div class="sp-card" style="max-width:640px;">
		<div class="sp-card-header">
			<h2 class="sp-card-title">Export</h2>
		</div>
		<div class="sp-card-body">
			<p style="font-size:13px; color:var(--sp-text-muted); margin-bottom:16px;">
				When you click the button below, SveltePress will create an XML file for you to save to your computer.
				This format, which is called WordPress eXtended RSS (WXR), will contain your posts, pages, comments, custom fields, categories, and tags.
			</p>

			<form
				method="POST"
				action="?/export"
				use:enhance={() => {
					exporting = true;
					return async ({ update }) => {
						await update({ reset: false });
						exporting = false;
					};
				}}
			>
				<div class="sp-card" style="margin-bottom:16px; border:1px solid var(--sp-border);">
					<div class="sp-card-body">
						<p style="font-size:13px; font-weight:600; margin-bottom:10px;">Choose what to export:</p>
						<label style="display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:8px;">
							<input type="radio" name="contentType" value="all" bind:group={contentType} />
							<span><strong>All content</strong> — Export all posts, pages, comments, and terms.</span>
						</label>
						<label style="display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:8px;">
							<input type="radio" name="contentType" value="posts" bind:group={contentType} />
							<span><strong>Posts</strong> — Export all posts and their comments.</span>
						</label>
						<label style="display:flex; align-items:center; gap:8px; font-size:13px;">
							<input type="radio" name="contentType" value="pages" bind:group={contentType} />
							<span><strong>Pages</strong> — Export all pages.</span>
						</label>
					</div>
				</div>

				<button type="submit" class="sp-btn sp-btn-primary" disabled={exporting}>
					{exporting ? 'Generating…' : 'Download Export File'}
				</button>
			</form>

			{#if form?.exportSuccess && form.exportXml}
				<div style="margin-top:24px;">
					<div class="sp-notice sp-notice-success" style="margin-bottom:12px;">
						Export generated for: <strong>{form.contentType}</strong>. Copy the XML below and save as a <code>.xml</code> file.
					</div>
					<label class="sp-label" style="margin-bottom:6px; display:block;">Export XML</label>
					<textarea
						class="sp-textarea"
						readonly
						style="font-family: monospace; font-size:11px; min-height:320px; background:#f6f7f7; white-space:pre;"
					>{form.exportXml}</textarea>
				</div>
			{/if}
		</div>
	</div>
{:else}
	<!-- Import Tab -->
	<div class="sp-card" style="max-width:640px;">
		<div class="sp-card-header">
			<h2 class="sp-card-title">Import</h2>
		</div>
		<div class="sp-card-body">
			<p style="font-size:13px; color:var(--sp-text-muted); margin-bottom:16px;">
				Import content from a WordPress WXR export file. Upload your XML file and SveltePress will import the posts, pages, and their comments.
			</p>

			{#if form?.importSuccess}
				<div class="sp-notice sp-notice-success" style="margin-bottom:16px;">
					Import successful! Imported <strong>{form.importedCount}</strong> item{form.importedCount !== 1 ? 's' : ''}.
				</div>
			{/if}

			{#if form?.importError}
				<div class="sp-notice sp-notice-error" style="margin-bottom:16px;">
					{form.importError}
				</div>
			{/if}

			<form
				method="POST"
				action="?/import"
				enctype="multipart/form-data"
				use:enhance={() => {
					importing = true;
					return async ({ update }) => {
						await update();
						importing = false;
					};
				}}
			>
				<div class="sp-field">
					<label class="sp-label" for="wxrFile">Choose a WXR (.xml) file to upload</label>
					<input
						type="file"
						id="wxrFile"
						name="wxrFile"
						accept=".xml,application/xml,text/xml"
						class="sp-input"
						required
					/>
					<p style="font-size:12px; color:var(--sp-text-muted); margin-top:4px;">
						Accepts WordPress WXR XML export files (.xml).
					</p>
				</div>

				<button type="submit" class="sp-btn sp-btn-primary" disabled={importing}>
					{importing ? 'Importing…' : 'Upload and Import'}
				</button>
			</form>
		</div>
	</div>
{/if}
