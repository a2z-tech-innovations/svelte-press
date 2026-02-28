<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate } from '$lib/utils.js';
	import BlockEditor from '$lib/components/blocks/BlockEditor.svelte';
	import type { Block } from '$lib/types/index.js';
	import type { PageData, ActionData } from './$types.js';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let title = $state(data.post.title);
	let slug = $state(data.post.slug);
	let excerpt = $state(data.post.excerpt ?? '');
	let status = $state(data.post.status as 'draft' | 'publish' | 'private' | 'pending');
	let authorId = $state(data.post.authorId);
	let parentId = $state(data.post.parentId ?? 0);
	let menuOrder = $state(data.post.menuOrder ?? 0);
	let template = $state(data.post.template ?? '');
	let commentStatus = $state(data.post.commentStatus as 'open' | 'closed');
	let content = $state(JSON.stringify(data.post.content ?? []));
	let sidebarOpen = $state(true);
	let activeTab = $state<'post' | 'block'>('post');
	let activePanelSection = $state('status');
	let saving = $state(false);
	let submitStatus = $state(data.post.status);

	function toggleSection(key: string) {
		activePanelSection = activePanelSection === key ? '' : key;
	}

	const templates = [
		{ value: '', label: 'Default Template' },
		{ value: 'full-width', label: 'Full Width' },
		{ value: 'blank', label: 'Blank' }
	];
</script>

<svelte:head>
	<title>Edit Page: {data.post.title || '(no title)'} — SveltePress</title>
</svelte:head>

{#if form?.error}
	<div class="sp-notice sp-notice-error" style="position:fixed;top:52px;left:50%;transform:translateX(-50%);z-index:999;">{form.error}</div>
{/if}
{#if form?.success}
	<div class="sp-notice sp-notice-success" style="position:fixed;top:52px;left:50%;transform:translateX(-50%);z-index:999;">Page updated.</div>
{/if}

<form method="POST" action="?/save" use:enhance={() => { saving = true; return async ({ update }) => { await update({ reset: false }); saving = false; }; }}>
	<input type="hidden" name="content" bind:value={content} />
	<input type="hidden" name="status" bind:value={submitStatus} />
	<input type="hidden" name="authorId" bind:value={authorId} />
	<input type="hidden" name="slug" bind:value={slug} />
	<input type="hidden" name="commentStatus" value={commentStatus} />

	<div class="sp-editor-wrap">
		<div class="sp-editor-topbar">
			<a href="/sp-admin/pages" class="sp-btn sp-btn-secondary sp-btn-sm" style="display:inline-flex;align-items:center;gap:4px;">
				<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M8 1L3 6l5 5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
				Pages
			</a>

			<div style="margin-left:auto; display:flex; align-items:center; gap:8px;">
				{#if data.post.status !== 'trash'}
					<button
						type="submit"
						class="sp-btn sp-btn-secondary sp-btn-sm"
						disabled={saving}
						onclick={() => { submitStatus = status; }}
					>
						{saving ? 'Saving…' : 'Save'}
					</button>
					{#if status !== 'publish'}
						<button
							type="submit"
							class="sp-btn sp-btn-primary sp-btn-sm"
							disabled={saving}
							onclick={() => { submitStatus = 'publish'; status = 'publish'; }}
						>Publish</button>
					{:else}
						<button
							type="submit"
							class="sp-btn sp-btn-primary sp-btn-sm"
							disabled={saving}
							onclick={() => { submitStatus = 'publish'; }}
						>Update</button>
					{/if}
				{:else}
					<form method="POST" action="?/restore" use:enhance style="display:inline">
						<button type="submit" class="sp-btn sp-btn-secondary sp-btn-sm">Restore</button>
					</form>
				{/if}
				<button type="button" class="sp-btn sp-btn-secondary sp-btn-sm" onclick={() => (sidebarOpen = !sidebarOpen)}>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><line x1="10" y1="2" x2="10" y2="14" stroke="currentColor" stroke-width="1.2"/></svg>
				</button>
			</div>
		</div>

		<div class="sp-editor-body">
			<div class="sp-editor-main">
				<div style="max-width:780px; margin:0 auto; padding:40px 24px;">
					<input
						type="text"
						name="title"
						class="sp-post-title-input"
						placeholder="Add title"
						bind:value={title}
						required
					/>
					<div style="margin:8px 0; font-size:13px; color:var(--sp-text-muted);">
						Permalink: <a href="/{slug}" target="_blank" style="color:var(--sp-primary)">/{slug}</a>
					</div>
					<div style="margin-top:24px;">
						<BlockEditor
							blocks={JSON.parse(content) as Block[]}
							onchange={(newBlocks) => { content = JSON.stringify(newBlocks); }}
						/>
					</div>
				</div>
			</div>

			{#if sidebarOpen}
				<div class="sp-editor-sidebar">
					<div class="sp-panel-tabs">
						<button type="button" class="sp-panel-tab" class:active={activeTab === 'post'} onclick={() => (activeTab = 'post')}>Page</button>
						<button type="button" class="sp-panel-tab" class:active={activeTab === 'block'} onclick={() => (activeTab = 'block')}>Block</button>
					</div>

					{#if activeTab === 'post'}
						<div class="sp-panel-section">
							<div class="sp-panel-section-header" onclick={() => toggleSection('status')}>
								<span>Status &amp; Visibility</span>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
							</div>
							{#if activePanelSection === 'status'}
								<div class="sp-panel-section-body">
									<div class="sp-field">
										<label class="sp-label">Status</label>
										<select class="sp-select" bind:value={status}>
											<option value="draft">Draft</option>
											<option value="pending">Pending Review</option>
											<option value="publish">Published</option>
											<option value="private">Private</option>
										</select>
									</div>
									<div class="sp-field" style="display:flex;align-items:center;gap:8px;margin-top:8px;">
										<input
											type="checkbox"
											id="commentStatus"
											checked={commentStatus === 'open'}
											onchange={(e) => { commentStatus = (e.target as HTMLInputElement).checked ? 'open' : 'closed'; }}
										/>
										<label for="commentStatus" class="sp-label" style="margin:0">Allow comments</label>
									</div>
									{#if data.post.postDate}
										<div style="font-size:12px; color:var(--sp-text-muted); margin-top:8px;">Published: {formatDate(data.post.postDate)}</div>
									{/if}
									{#if data.post.status !== 'trash'}
										<div style="margin-top:12px;">
											<form method="POST" action="?/trash" use:enhance style="display:inline">
												<button type="submit" class="sp-btn-link" style="color:var(--sp-danger); font-size:12px;" onclick={(e) => { if (!confirm('Move to trash?')) e.preventDefault(); }}>Move to Trash</button>
											</form>
										</div>
									{/if}
								</div>
							{/if}
						</div>

						<div class="sp-panel-section">
							<div class="sp-panel-section-header" onclick={() => toggleSection('slug')}>
								<span>Permalink</span>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
							</div>
							{#if activePanelSection === 'slug'}
								<div class="sp-panel-section-body">
									<div class="sp-field">
										<label class="sp-label">URL Slug</label>
										<input type="text" class="sp-input" bind:value={slug} />
									</div>
								</div>
							{/if}
						</div>

						<div class="sp-panel-section">
							<div class="sp-panel-section-header" onclick={() => toggleSection('attributes')}>
								<span>Page Attributes</span>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
							</div>
							{#if activePanelSection === 'attributes'}
								<div class="sp-panel-section-body">
									<div class="sp-field">
										<label class="sp-label">Parent Page</label>
										<select class="sp-select" name="parentId" bind:value={parentId} style="width:100%">
											<option value={0}>(no parent)</option>
											{#each data.allPages as pg}
												<option value={pg.id}>{pg.title || '(no title)'}</option>
											{/each}
										</select>
									</div>
									<div class="sp-field">
										<label class="sp-label">Template</label>
										<select class="sp-select" name="template" bind:value={template} style="width:100%">
											{#each templates as t}
												<option value={t.value}>{t.label}</option>
											{/each}
										</select>
									</div>
									<div class="sp-field">
										<label class="sp-label">Order</label>
										<input type="number" class="sp-input" name="menuOrder" bind:value={menuOrder} min="0" />
									</div>
								</div>
							{/if}
						</div>

						<div class="sp-panel-section">
							<div class="sp-panel-section-header" onclick={() => toggleSection('author')}>
								<span>Author</span>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
							</div>
							{#if activePanelSection === 'author'}
								<div class="sp-panel-section-body">
									<select class="sp-select" bind:value={authorId} style="width:100%">
										{#each data.allUsers as u}
											<option value={u.id}>{u.displayName}</option>
										{/each}
									</select>
								</div>
							{/if}
						</div>

						<div class="sp-panel-section">
							<div class="sp-panel-section-header" onclick={() => toggleSection('excerpt')}>
								<span>Excerpt</span>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
							</div>
							{#if activePanelSection === 'excerpt'}
								<div class="sp-panel-section-body">
									<textarea name="excerpt" class="sp-textarea" bind:value={excerpt} style="min-height:80px; width:100%;"></textarea>
								</div>
							{/if}
						</div>
					{:else}
						<div style="padding:16px; color:var(--sp-text-muted); font-size:13px;">Select a block to see its settings.</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</form>
