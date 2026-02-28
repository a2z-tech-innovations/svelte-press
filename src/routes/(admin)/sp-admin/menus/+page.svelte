<script lang="ts">
	import { enhance } from '$app/forms';

	import type { PageData, ActionData } from './$types.js';
	let { data, form }: { data: PageData; form?: ActionData } = $props();

	type MenuItem = {
		id?: number;
		title: string;
		url: string;
		order: number;
		parentId: number | null;
		postId: number | null;
		termId: number | null;
		target: string;
		classes: string;
		depth?: number;
	};

	let selectedMenuId = $state<number | null>(data.menus[0]?.id ?? null);
	let activeTab = $state<'pages' | 'posts' | 'custom' | 'categories'>('pages');
	let newMenuName = $state('');
	let customLinkTitle = $state('');
	let customLinkUrl = $state('');
	let saving = $state(false);
	let creating = $state(false);

	let selectedPageIds = $state<Set<number>>(new Set());
	let selectedPostIds = $state<Set<number>>(new Set());
	let selectedCatIds = $state<Set<number>>(new Set());

	const selectedMenu = $derived(data.menus.find((m) => m.id === selectedMenuId) ?? null);

	let menuItemsList = $state<MenuItem[]>(
		selectedMenu?.items?.map((item, i) => ({
			id: item.id,
			title: item.title,
			url: item.url ?? '',
			order: item.order ?? i,
			parentId: item.parentId,
			postId: item.postId,
			termId: item.termId,
			target: item.target ?? '',
			classes: item.classes ?? '',
			depth: 0
		})) ?? []
	);

	$effect(() => {
		const menu = data.menus.find((m) => m.id === selectedMenuId);
		menuItemsList = menu?.items?.map((item, i) => ({
			id: item.id,
			title: item.title,
			url: item.url ?? '',
			order: item.order ?? i,
			parentId: item.parentId,
			postId: item.postId,
			termId: item.termId,
			target: item.target ?? '',
			classes: item.classes ?? '',
			depth: 0
		})) ?? [];
	});

	function addItems() {
		const newItems: MenuItem[] = [];
		const currentMax = menuItemsList.length;

		for (const id of selectedPageIds) {
			const pg = data.pages.find((p) => p.id === id);
			if (pg) newItems.push({ title: pg.title || '(no title)', url: `/${pg.id}`, order: currentMax + newItems.length, parentId: null, postId: id, termId: null, target: '', classes: '' });
		}
		for (const id of selectedPostIds) {
			const p = data.posts.find((p) => p.id === id);
			if (p) newItems.push({ title: p.title || '(no title)', url: `/${id}`, order: currentMax + newItems.length, parentId: null, postId: id, termId: null, target: '', classes: '' });
		}
		for (const id of selectedCatIds) {
			const cat = data.categories.find((c) => c.id === id);
			if (cat) newItems.push({ title: cat.name, url: `/category/${cat.id}`, order: currentMax + newItems.length, parentId: null, postId: null, termId: id, target: '', classes: '' });
		}

		if (customLinkTitle && customLinkUrl) {
			newItems.push({ title: customLinkTitle, url: customLinkUrl, order: currentMax + newItems.length, parentId: null, postId: null, termId: null, target: '', classes: '' });
			customLinkTitle = '';
			customLinkUrl = '';
		}

		menuItemsList = [...menuItemsList, ...newItems];
		selectedPageIds = new Set();
		selectedPostIds = new Set();
		selectedCatIds = new Set();
	}

	function removeItem(idx: number) {
		menuItemsList = menuItemsList.filter((_, i) => i !== idx);
	}

	function indentItem(idx: number) {
		if (idx === 0) return;
		const item = menuItemsList[idx];
		const prev = menuItemsList[idx - 1];
		item.parentId = prev.postId ?? prev.termId ?? null;
		menuItemsList = [...menuItemsList];
	}

	function outdentItem(idx: number) {
		const item = menuItemsList[idx];
		item.parentId = null;
		menuItemsList = [...menuItemsList];
	}

	function moveUp(idx: number) {
		if (idx === 0) return;
		const arr = [...menuItemsList];
		[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
		menuItemsList = arr.map((item, i) => ({ ...item, order: i }));
	}

	function moveDown(idx: number) {
		if (idx >= menuItemsList.length - 1) return;
		const arr = [...menuItemsList];
		[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
		menuItemsList = arr.map((item, i) => ({ ...item, order: i }));
	}
</script>

<svelte:head>
	<title>Menus — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Menus</h1>
</div>

{#if form?.success}
	<div class="sp-notice sp-notice-success">Menu saved successfully.</div>
{/if}
{#if form?.error}
	<div class="sp-notice sp-notice-error">{form.error}</div>
{/if}

<div style="display:grid; grid-template-columns:300px 1fr; gap:24px; align-items:start;">
	<!-- Left: Add Items Panel -->
	<div style="display:flex;flex-direction:column;gap:16px;">
		<!-- Add to Menu sources -->
		<div class="sp-card">
			<div class="sp-card-header"><h2 class="sp-card-title">Add to Menu</h2></div>
			<div class="sp-card-body" style="padding:0;">
				<div class="sp-panel-tabs" style="border-bottom:1px solid var(--sp-border);">
					<button type="button" class="sp-panel-tab" class:active={activeTab === 'pages'} onclick={() => (activeTab = 'pages')}>Pages</button>
					<button type="button" class="sp-panel-tab" class:active={activeTab === 'posts'} onclick={() => (activeTab = 'posts')}>Posts</button>
					<button type="button" class="sp-panel-tab" class:active={activeTab === 'custom'} onclick={() => (activeTab = 'custom')}>Custom</button>
					<button type="button" class="sp-panel-tab" class:active={activeTab === 'categories'} onclick={() => (activeTab = 'categories')}>Categories</button>
				</div>
				<div style="padding:12px;">
					{#if activeTab === 'pages'}
						<div style="max-height:200px;overflow-y:auto;margin-bottom:8px;">
							{#each data.pages as pg}
								<label style="display:flex;align-items:center;gap:8px;font-size:13px;padding:3px 0;">
									<input type="checkbox" checked={selectedPageIds.has(pg.id)} onchange={(e) => { const n = new Set(selectedPageIds); if ((e.target as HTMLInputElement).checked) n.add(pg.id); else n.delete(pg.id); selectedPageIds = n; }} />
									{pg.title || '(no title)'}
								</label>
							{/each}
							{#if data.pages.length === 0}
								<p style="font-size:13px;color:var(--sp-text-muted);">No pages.</p>
							{/if}
						</div>
					{:else if activeTab === 'posts'}
						<div style="max-height:200px;overflow-y:auto;margin-bottom:8px;">
							{#each data.posts as post}
								<label style="display:flex;align-items:center;gap:8px;font-size:13px;padding:3px 0;">
									<input type="checkbox" checked={selectedPostIds.has(post.id)} onchange={(e) => { const n = new Set(selectedPostIds); if ((e.target as HTMLInputElement).checked) n.add(post.id); else n.delete(post.id); selectedPostIds = n; }} />
									{post.title || '(no title)'}
								</label>
							{/each}
							{#if data.posts.length === 0}
								<p style="font-size:13px;color:var(--sp-text-muted);">No posts.</p>
							{/if}
						</div>
					{:else if activeTab === 'custom'}
						<div class="sp-field">
							<label class="sp-label">URL</label>
							<input type="url" class="sp-input" bind:value={customLinkUrl} placeholder="https://" />
						</div>
						<div class="sp-field">
							<label class="sp-label">Link Text</label>
							<input type="text" class="sp-input" bind:value={customLinkTitle} placeholder="Link text" />
						</div>
					{:else if activeTab === 'categories'}
						<div style="max-height:200px;overflow-y:auto;margin-bottom:8px;">
							{#each data.categories as cat}
								<label style="display:flex;align-items:center;gap:8px;font-size:13px;padding:3px 0;">
									<input type="checkbox" checked={selectedCatIds.has(cat.id)} onchange={(e) => { const n = new Set(selectedCatIds); if ((e.target as HTMLInputElement).checked) n.add(cat.id); else n.delete(cat.id); selectedCatIds = n; }} />
									{cat.name}
								</label>
							{/each}
						</div>
					{/if}
					<button type="button" class="sp-btn sp-btn-primary sp-btn-sm" onclick={addItems} disabled={!selectedMenuId}>
						Add to Menu
					</button>
				</div>
			</div>
		</div>

		<!-- Create New Menu -->
		<div class="sp-card">
			<div class="sp-card-header"><h2 class="sp-card-title">Create New Menu</h2></div>
			<div class="sp-card-body">
				<form method="POST" action="?/create" use:enhance={() => { creating = true; return async ({ update }) => { await update(); creating = false; newMenuName = ''; }; }}>
					<div class="sp-field">
						<label class="sp-label" for="menuName">Menu Name</label>
						<input type="text" id="menuName" name="name" class="sp-input" bind:value={newMenuName} required />
					</div>
					<button type="submit" class="sp-btn sp-btn-secondary sp-btn-sm" disabled={creating}>
						{creating ? 'Creating…' : 'Create Menu'}
					</button>
				</form>
			</div>
		</div>
	</div>

	<!-- Right: Menu Editor -->
	<div class="sp-card">
		<div class="sp-card-header" style="display:flex;align-items:center;justify-content:space-between;">
			<h2 class="sp-card-title">Menu Structure</h2>
			<div style="display:flex;gap:8px;align-items:center;">
				<select class="sp-select" bind:value={selectedMenuId} style="width:auto">
					{#if data.menus.length === 0}
						<option value={null}>No menus</option>
					{/if}
					{#each data.menus as menu}
						<option value={menu.id}>{menu.name}</option>
					{/each}
				</select>
				{#if selectedMenuId}
					<form method="POST" action="?/delete" use:enhance style="display:inline">
						<input type="hidden" name="menuId" value={selectedMenuId} />
						<button type="submit" class="sp-btn sp-btn-danger sp-btn-sm" onclick={(e) => { if (!confirm('Delete this menu?')) e.preventDefault(); }}>Delete</button>
					</form>
				{/if}
			</div>
		</div>
		<div class="sp-card-body">
			{#if !selectedMenuId}
				<p style="color:var(--sp-text-muted);font-size:13px;">Select or create a menu to begin.</p>
			{:else if menuItemsList.length === 0}
				<p style="color:var(--sp-text-muted);font-size:13px;border:2px dashed var(--sp-border);padding:24px;text-align:center;border-radius:4px;">
					Add menu items from the left panel.
				</p>
			{:else}
				<div style="margin-bottom:12px;">
					{#each menuItemsList as item, idx}
						<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--sp-border);border-radius:4px;margin-bottom:6px;background:#fff;margin-left:{item.parentId ? 40 : 0}px;">
							<div style="flex:1;">
								<input type="text" class="sp-input" bind:value={item.title} style="font-size:13px;" />
								<input type="text" class="sp-input" bind:value={item.url} style="font-size:12px;margin-top:4px;color:var(--sp-text-muted);" placeholder="URL" />
							</div>
							<div style="display:flex;flex-direction:column;gap:2px;">
								<button type="button" class="sp-btn sp-btn-sm sp-btn-secondary" onclick={() => moveUp(idx)} title="Move up" disabled={idx === 0}>↑</button>
								<button type="button" class="sp-btn sp-btn-sm sp-btn-secondary" onclick={() => moveDown(idx)} title="Move down" disabled={idx === menuItemsList.length - 1}>↓</button>
							</div>
							<div style="display:flex;flex-direction:column;gap:2px;">
								<button type="button" class="sp-btn sp-btn-sm sp-btn-secondary" onclick={() => indentItem(idx)} title="Indent" disabled={idx === 0}>→</button>
								<button type="button" class="sp-btn sp-btn-sm sp-btn-secondary" onclick={() => outdentItem(idx)} title="Outdent" disabled={!item.parentId}>←</button>
							</div>
							<button type="button" class="sp-btn sp-btn-sm sp-btn-danger" onclick={() => removeItem(idx)} title="Remove">×</button>
						</div>
					{/each}
				</div>
			{/if}

			{#if selectedMenuId}
				<form method="POST" action="?/save" use:enhance={() => { saving = true; return async ({ update }) => { await update({ reset: false }); saving = false; }; }}>
					<input type="hidden" name="menuId" value={selectedMenuId} />
					<input type="hidden" name="items" value={JSON.stringify(menuItemsList.map((item, i) => ({ ...item, order: i })))} />
					<button type="submit" class="sp-btn sp-btn-primary" disabled={saving}>
						{saving ? 'Saving…' : 'Save Menu'}
					</button>
				</form>
			{/if}
		</div>
	</div>
</div>
