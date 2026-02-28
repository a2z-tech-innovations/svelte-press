<script lang="ts">
	import { enhance } from '$app/forms';
	import { slugify, formatDate, getPermalinkUrl } from '$lib/utils.js';
	import BlockEditor from '$lib/components/blocks/BlockEditor.svelte';
	import type { Block } from '$lib/types/index.js';

	import type { PageData, ActionData } from './$types.js';
	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let title = $state(data.post.title);
	let slug = $state(data.post.slug);
	let excerpt = $state(data.post.excerpt ?? '');
	let status = $state(data.post.status as 'draft' | 'publish' | 'private' | 'pending');
	let postPassword = $state(data.postPassword ?? '');
	let authorId = $state(data.post.authorId);
	let sticky = $state(data.post.sticky);
	let commentStatus = $state(data.post.commentStatus as 'open' | 'closed');
	let content = $state(JSON.stringify(data.post.content ?? []));
	let sidebarOpen = $state(true);
	let activeTab = $state<'post' | 'block'>('post');
	let activePanelSection = $state('status');
	let selectedCategoryIds = $state<Set<number>>(new Set(data.postCategories.map((c) => c.id)));
	let tagInput = $state('');
	let selectedTagIds = $state<Set<number>>(new Set(data.postTags.map((t) => t.id)));
	let saving = $state(false);
	let submitStatus = $state(status);

	// Derive the canonical permalink URL from the current slug, post date, and permalink structure
	let permalinkPreview = $derived(
		getPermalinkUrl(
			{ id: data.post.id, slug, postDate: data.post.postDate },
			data.permalinkStructure ?? '/%postname%/'
		)
	);

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
	<title>Edit Post: {data.post.title || '(no title)'} — SveltePress</title>
</svelte:head>

{#if form?.error}
	<div class="sp-notice sp-notice-error" style="position:fixed;top:52px;left:50%;transform:translateX(-50%);z-index:999;">{form.error}</div>
{/if}
{#if form?.success}
	<div class="sp-notice sp-notice-success" style="position:fixed;top:52px;left:50%;transform:translateX(-50%);z-index:999;">Post updated.</div>
{/if}

<form method="POST" action="?/save" use:enhance={() => { saving = true; return async ({ update }) => { await update({ reset: false }); saving = false; }; }}>
	<input type="hidden" name="content" bind:value={content} />
	<input type="hidden" name="status" bind:value={submitStatus} />
	<input type="hidden" name="authorId" bind:value={authorId} />
	<input type="hidden" name="slug" bind:value={slug} />
	<input type="hidden" name="commentStatus" value={commentStatus} />
	{#if status === 'private'}
		<input type="hidden" name="postPassword" bind:value={postPassword} />
	{/if}
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

			<div style="margin-left:auto; display:flex; align-items:center; gap:8px;">
				{#if data.post.status !== 'trash'}
					<button
						type="submit"
						class="sp-btn sp-btn-secondary sp-btn-sm"
						disabled={saving}
						onclick={() => { submitStatus = status === 'publish' ? 'publish' : 'draft'; }}
					>
						{saving ? 'Saving…' : 'Save'}
					</button>
					{#if status !== 'publish'}
						<button
							type="submit"
							class="sp-btn sp-btn-primary sp-btn-sm"
							disabled={saving}
							onclick={() => { submitStatus = 'publish'; status = 'publish'; }}
						>
							Publish
						</button>
					{:else}
						<button
							type="submit"
							class="sp-btn sp-btn-primary sp-btn-sm"
							disabled={saving}
							onclick={() => { submitStatus = 'publish'; }}
						>
							Update
						</button>
					{/if}
				{:else}
					<button type="submit" form="sp-restore-form" class="sp-btn sp-btn-secondary sp-btn-sm">Restore</button>
				{/if}
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
			<!-- Main Editor -->
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
						Permalink: <a href={permalinkPreview} target="_blank" style="color:var(--sp-primary)">{permalinkPreview}</a>
						<span style="margin-left:8px;">
							<a href="/sp-admin/revisions/{data.post.id}" style="font-size:12px; color:var(--sp-text-muted);">Browse revisions</a>
						</span>
					</div>
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
					<div class="sp-panel-tabs">
						<button type="button" class="sp-panel-tab" class:active={activeTab === 'post'} onclick={() => (activeTab = 'post')}>Post</button>
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
										<label class="sp-label">Status</label>
										<select class="sp-select" bind:value={status} onchange={() => { submitStatus = status; }}>
											<option value="draft">Draft</option>
											<option value="pending">Pending Review</option>
											<option value="publish">Published</option>
											<option value="private">Private / Password Protected</option>
										</select>
									</div>
									{#if status === 'private'}
										<div class="sp-field" style="margin-top:8px;">
											<label class="sp-label" for="post-password">Post Password</label>
											<input
												id="post-password"
												type="text"
												class="sp-input"
												placeholder="Leave blank for no password gate…"
												bind:value={postPassword}
												autocomplete="off"
											/>
											<p style="font-size:11px; color:var(--sp-text-muted); margin-top:4px;">
												If set, visitors must enter this password to view the post.
											</p>
										</div>
									{/if}
									<div class="sp-field" style="display:flex;align-items:center;gap:8px;margin-top:8px;">
										<input type="checkbox" id="sticky" bind:checked={sticky} />
										<label for="sticky" class="sp-label" style="margin:0">Stick to the top</label>
									</div>
									<input type="hidden" name="sticky" value={sticky ? '1' : '0'} />
									{#if data.post.postDate}
										<div style="font-size:12px; color:var(--sp-text-muted); margin-top:8px;">
											Published: {formatDate(data.post.postDate)}
										</div>
									{/if}
									{#if data.post.status !== 'trash'}
										<div style="margin-top:12px;">
											<button type="submit" form="sp-trash-form" class="sp-btn-link" style="color:var(--sp-danger); font-size:12px;" onclick={(e) => { if (!confirm('Move to trash?')) e.preventDefault(); }}>Move to Trash</button>
										</div>
									{/if}
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
										<input type="text" class="sp-input" bind:value={slug} />
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
								</div>
							{/if}
						</div>

					{:else}
						<div style="padding:16px; color:var(--sp-text-muted); font-size:13px;">
							Select a block to see its settings.
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</form>

<form id="sp-trash-form" method="POST" action="?/trash" use:enhance></form>
<form id="sp-restore-form" method="POST" action="?/restore" use:enhance></form>
