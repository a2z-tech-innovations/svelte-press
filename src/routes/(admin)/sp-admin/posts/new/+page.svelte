<script lang="ts">
	import { enhance } from '$app/forms';
	import { slugify } from '$lib/utils.js';
	import BlockEditor from '$lib/components/blocks/BlockEditor.svelte';
	import type { Block } from '$lib/types/index.js';

	import type { PageData, ActionData } from './$types.js';
	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let title = $state('');
	let slug = $state('');
	let excerpt = $state('');
	let status = $state<'draft' | 'publish' | 'private' | 'pending'>('draft');
	let visibility = $state<'public' | 'private' | 'password'>('public');
	let authorId = $state(data.allUsers[0]?.id ?? 1);
	let sticky = $state(false);
	let commentStatus = $state<'open' | 'closed'>('open');
	let content = $state('[]');
	let sidebarOpen = $state(true);
	let activeTab = $state<'post' | 'block'>('post');
	let activePanelSection = $state<string>('status');
	let selectedCategoryIds = $state<Set<number>>(new Set());
	let tagInput = $state('');
	let selectedTagIds = $state<Set<number>>(new Set());
	let saving = $state(false);

	let slugManuallyEdited = $state(false);

	$effect(() => {
		if (title && !slugManuallyEdited) {
			slug = slugify(title);
		}
	});

	function toggleSection(key: string) {
		activePanelSection = activePanelSection === key ? '' : key;
	}

	function addTagByName() {
		const name = tagInput.trim();
		if (!name) return;
		const existing = data.tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
		if (existing) {
			selectedTagIds = new Set([...selectedTagIds, existing.id]);
		}
		tagInput = '';
	}
</script>

<svelte:head>
	<title>Add New Post — SveltePress</title>
</svelte:head>

{#if form?.error}
	<div class="sp-notice sp-notice-error" style="margin-bottom:12px">{form.error}</div>
{/if}

<form method="POST" action="?/save" use:enhance={() => { saving = true; return async ({ update }) => { await update(); saving = false; }; }}>
	<input type="hidden" name="content" bind:value={content} />
	<input type="hidden" name="status" bind:value={status} />
	<input type="hidden" name="authorId" bind:value={authorId} />
	<input type="hidden" name="slug" bind:value={slug} />
	{#each [...selectedCategoryIds] as id}
		<input type="hidden" name="categoryIds" value={id} />
	{/each}
	{#each [...selectedTagIds] as id}
		<input type="hidden" name="tagIds" value={id} />
	{/each}

	<div class="sp-editor-wrap">
		<!-- Top Bar -->
		<div class="sp-editor-topbar">
			<a href="/sp-admin/posts" class="sp-btn sp-btn-secondary sp-btn-sm" style="display:inline-flex;align-items:center;gap:4px;">
				<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M8 1L3 6l5 5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
				Posts
			</a>
			<span style="font-size:13px; color:var(--sp-text-muted); margin-left:8px;">Add New Post</span>

			<div style="margin-left:auto; display:flex; align-items:center; gap:8px;">
				<button
					type="submit"
					class="sp-btn sp-btn-secondary sp-btn-sm"
					disabled={saving}
					onclick={() => { status = visibility === 'private' ? 'private' : 'draft'; }}
				>
					{saving && status === 'draft' ? 'Saving…' : 'Save Draft'}
				</button>
				<button
					type="submit"
					class="sp-btn sp-btn-primary sp-btn-sm"
					disabled={saving}
					onclick={() => { status = visibility === 'private' ? 'private' : visibility === 'password' ? 'draft' : 'publish'; }}
				>
					{saving && status === 'publish' ? 'Publishing…' : 'Publish'}
				</button>
				<button
					type="button"
					class="sp-btn sp-btn-secondary sp-btn-sm"
					onclick={() => (sidebarOpen = !sidebarOpen)}
					title="Toggle sidebar"
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><line x1="10" y1="2" x2="10" y2="14" stroke="currentColor" stroke-width="1.2"/></svg>
				</button>
			</div>
		</div>

		<div class="sp-editor-body">
			<!-- Main Editor Area -->
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
						<BlockEditor
							blocks={JSON.parse(content) as Block[]}
							onchange={(newBlocks) => { content = JSON.stringify(newBlocks); }}
						/>
					</div>
				</div>
			</div>

			<!-- Sidebar -->
			{#if sidebarOpen}
				<div class="sp-editor-sidebar">
					<!-- Panel Tabs -->
					<div class="sp-panel-tabs">
						<button
							type="button"
							class="sp-panel-tab"
							class:active={activeTab === 'post'}
							onclick={() => (activeTab = 'post')}
						>Post</button>
						<button
							type="button"
							class="sp-panel-tab"
							class:active={activeTab === 'block'}
							onclick={() => (activeTab = 'block')}
						>Block</button>
					</div>

					{#if activeTab === 'post'}
						<!-- Status & Visibility -->
						<div class="sp-panel-section">
							<div class="sp-panel-section-header" onclick={() => toggleSection('status')}>
								<span>Status &amp; Visibility</span>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
							</div>
							{#if activePanelSection === 'status' || activePanelSection === ''}
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
										<input type="checkbox" id="sticky" bind:checked={sticky} />
										<label for="sticky" class="sp-label" style="margin:0">Stick to the top of the blog</label>
									</div>
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
									<textarea
										name="excerpt"
										class="sp-textarea"
										placeholder="Write an excerpt (optional)"
										bind:value={excerpt}
										style="min-height:80px; width:100%;"
									></textarea>
								</div>
							{/if}
						</div>

						<!-- Discussion -->
						<div class="sp-panel-section">
							<div class="sp-panel-section-header" onclick={() => toggleSection('discussion')}>
								<span>Discussion</span>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
							</div>
							{#if activePanelSection === 'discussion'}
								<div class="sp-panel-section-body">
									<div style="display:flex;align-items:center;gap:8px;">
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
						<input type="hidden" name="commentStatus" value={commentStatus} />

						<!-- Slug -->
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

						<!-- Categories -->
						<div class="sp-panel-section">
							<div class="sp-panel-section-header" onclick={() => toggleSection('categories')}>
								<span>Categories</span>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
							</div>
							{#if activePanelSection === 'categories'}
								<div class="sp-panel-section-body">
									<div style="max-height:200px; overflow-y:auto;">
										{#each data.categories as cat}
											<div style="display:flex;align-items:center;gap:8px;padding:4px 0;">
												<input
													type="checkbox"
													id="cat-{cat.id}"
													checked={selectedCategoryIds.has(cat.id)}
													onchange={(e) => {
														const next = new Set(selectedCategoryIds);
														if ((e.target as HTMLInputElement).checked) next.add(cat.id);
														else next.delete(cat.id);
														selectedCategoryIds = next;
													}}
												/>
												<label for="cat-{cat.id}" style="font-size:13px; cursor:pointer;">{cat.name}</label>
											</div>
										{/each}
										{#if data.categories.length === 0}
											<p style="font-size:13px; color:var(--sp-text-muted)">No categories yet. <a href="/sp-admin/categories" style="color:var(--sp-primary)">Add one</a>.</p>
										{/if}
									</div>
									<a href="/sp-admin/categories" style="font-size:12px; color:var(--sp-primary); display:block; margin-top:8px;">+ Add New Category</a>
								</div>
							{/if}
						</div>

						<!-- Tags -->
						<div class="sp-panel-section">
							<div class="sp-panel-section-header" onclick={() => toggleSection('tags')}>
								<span>Tags</span>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
							</div>
							{#if activePanelSection === 'tags'}
								<div class="sp-panel-section-body">
									<div style="display:flex; gap:6px; margin-bottom:8px;">
										<input
											type="text"
											class="sp-input"
											placeholder="Add tag…"
											bind:value={tagInput}
											onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTagByName(); } }}
											style="flex:1"
										/>
										<button type="button" class="sp-btn sp-btn-secondary sp-btn-sm" onclick={addTagByName}>Add</button>
									</div>
									<div style="display:flex; flex-wrap:wrap; gap:4px;">
										{#each data.tags.filter((t) => selectedTagIds.has(t.id)) as tag}
											<span style="display:inline-flex;align-items:center;gap:4px;background:#f0f0f1;padding:2px 8px;border-radius:12px;font-size:12px;">
												{tag.name}
												<button type="button" onclick={() => { const n = new Set(selectedTagIds); n.delete(tag.id); selectedTagIds = n; }} style="background:none;border:none;cursor:pointer;font-size:14px;line-height:1;color:var(--sp-text-muted);">×</button>
											</span>
										{/each}
									</div>
									<details style="margin-top:8px;">
										<summary style="font-size:12px; cursor:pointer; color:var(--sp-text-muted)">Choose from most used tags</summary>
										<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">
											{#each data.tags as tag}
												<button
													type="button"
													class="sp-btn sp-btn-sm"
													style="font-size:11px;"
													onclick={() => { selectedTagIds = new Set([...selectedTagIds, tag.id]); }}
												>{tag.name}</button>
											{/each}
										</div>
									</details>
								</div>
							{/if}
						</div>

					{:else}
						<div class="sp-panel-section-body" style="padding:16px; color:var(--sp-text-muted); font-size:13px;">
							Select a block to see its settings.
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</form>
