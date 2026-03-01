<script lang="ts">
	import { enhance } from '$app/forms';
	import { slugify } from '$lib/utils.js';
	import TiptapEditor from '$lib/components/editor/TiptapEditor.svelte';
	import type { JSONContent } from '@tiptap/core';
	import type { PageData, ActionData } from './$types.js';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let title = $state('');
	let slug = $state('');
	let excerpt = $state('');
	let status = $state<'draft' | 'publish' | 'private' | 'pending'>('draft');
	let visibility = $state<'public' | 'private' | 'password'>('public');
	let authorId = $state(data.allUsers[0]?.id ?? 1);
	let parentId = $state(0);
	let menuOrder = $state(0);
	let template = $state('');
	let commentStatus = $state<'open' | 'closed'>('open');
	let content = $state('[]');
	let sidebarOpen = $state(true);
	let activeTab = $state<'post' | 'block'>('post');
	let activePanelSection = $state('status');
	let saving = $state(false);
	let submitStatus = $state<string>('draft');

	let slugManuallyEdited = $state(false);

	$effect(() => {
		if (title && !slugManuallyEdited) {
			slug = slugify(title);
		}
	});

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
	<title>Add New Page — SveltePress</title>
</svelte:head>

{#if form?.error}
	<div class="sp-notice sp-notice-error" style="margin-bottom:12px">{form.error}</div>
{/if}

<form method="POST" action="?/save" use:enhance={() => { saving = true; return async ({ update }) => { await update(); saving = false; }; }}>
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
			<span style="font-size:13px; color:var(--sp-text-muted); margin-left:8px;">Add New Page</span>

			<div style="margin-left:auto; display:flex; align-items:center; gap:8px;">
				<button
					type="submit"
					class="sp-btn sp-btn-secondary sp-btn-sm"
					disabled={saving}
					onclick={() => { submitStatus = visibility === 'private' ? 'private' : 'draft'; }}
				>
					{saving && submitStatus === 'draft' ? 'Saving…' : 'Save Draft'}
				</button>
				<button
					type="submit"
					class="sp-btn sp-btn-primary sp-btn-sm"
					disabled={saving}
					onclick={() => { submitStatus = visibility === 'private' ? 'private' : visibility === 'password' ? 'draft' : 'publish'; }}
				>
					{saving && submitStatus === 'publish' ? 'Publishing…' : 'Publish'}
				</button>
				<button
					type="button"
					class="sp-btn sp-btn-secondary sp-btn-sm"
					onclick={() => (sidebarOpen = !sidebarOpen)}
				>
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
					<div style="margin-top:24px;">
						<TiptapEditor
							initialContent={null}
							onchange={(json: JSONContent) => { content = JSON.stringify(json); }}
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
						<!-- Status & Visibility -->
						<div class="sp-panel-section">
							<div class="sp-panel-section-header" onclick={() => toggleSection('status')}>
								<span>Status &amp; Visibility</span>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
							</div>
							{#if activePanelSection === 'status'}
								<div class="sp-panel-section-body">
									<div class="sp-field">
										<label class="sp-label">Visibility</label>
										<select class="sp-select" bind:value={visibility}>
											<option value="public">Public</option>
											<option value="private">Private</option>
											<option value="password">Password Protected</option>
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
								</div>
							{/if}
						</div>

						<!-- Permalink -->
						<div class="sp-panel-section">
							<div class="sp-panel-section-header" onclick={() => toggleSection('slug')}>
								<span>Permalink</span>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
							</div>
							{#if activePanelSection === 'slug'}
								<div class="sp-panel-section-body">
									<div class="sp-field">
										<label class="sp-label">URL Slug</label>
										<input type="text" class="sp-input" bind:value={slug} oninput={() => { slugManuallyEdited = true; }} />
									</div>
								</div>
							{/if}
						</div>

						<!-- Page Attributes -->
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

						<!-- Author -->
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

						<!-- Excerpt -->
						<div class="sp-panel-section">
							<div class="sp-panel-section-header" onclick={() => toggleSection('excerpt')}>
								<span>Excerpt</span>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
							</div>
							{#if activePanelSection === 'excerpt'}
								<div class="sp-panel-section-body">
									<textarea name="excerpt" class="sp-textarea" placeholder="Write an excerpt (optional)" bind:value={excerpt} style="min-height:80px; width:100%;"></textarea>
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
