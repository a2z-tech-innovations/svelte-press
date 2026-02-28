<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import type { Snippet } from 'svelte';
	import type { User } from '$lib/types/index.js';

	interface LayoutData {
		user: User;
		siteOptions: Record<string, string>;
		pendingComments: number;
	}

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	let sidebarOpen = $state(true);
	let userMenuOpen = $state(false);

	// Expandable sidebar menus
	let expanded = $state<Record<string, boolean>>({
		posts: false,
		media: false,
		pages: false,
		appearance: false,
		users: false,
		settings: false,
		tools: false
	});

	function toggle(key: string) {
		expanded[key] = !expanded[key];
	}

	function isActive(path: string) {
		return page.url.pathname.startsWith(path);
	}

	function isExact(path: string) {
		return page.url.pathname === path;
	}

	// Auto-expand based on current route
	$effect(() => {
		const p = page.url.pathname;
		if (p.includes('/sp-admin/posts') || p.includes('/sp-admin/categories') || p.includes('/sp-admin/tags')) expanded.posts = true;
		if (p.includes('/sp-admin/media')) expanded.media = true;
		if (p.includes('/sp-admin/pages')) expanded.pages = true;
		if (p.includes('/sp-admin/themes') || p.includes('/sp-admin/menus') || p.includes('/sp-admin/widgets')) expanded.appearance = true;
		if (p.includes('/sp-admin/users') || p.includes('/sp-admin/profile')) expanded.users = true;
		if (p.includes('/sp-admin/settings')) expanded.settings = true;
		if (p.includes('/sp-admin/tools')) expanded.tools = true;
	});

	const siteName = $derived(data.siteOptions['blogname'] ?? 'SveltePress');
	const siteUrl = $derived(data.siteOptions['siteurl'] ?? '/');
	const initials = $derived(
		data.user.displayName
			.split(' ')
			.slice(0, 2)
			.map((w) => w[0] ?? '')
			.join('')
			.toUpperCase() || 'SP'
	);
</script>

<svelte:window on:click={(e) => {
	if (userMenuOpen && !(e.target as Element).closest?.('.sp-user-menu')) {
		userMenuOpen = false;
	}
}} />

<div class="sp-admin-wrap">
	<!-- Sidebar -->
	<nav class="sp-sidebar" class:open={sidebarOpen} aria-label="Admin navigation">
		<a href="/sp-admin/dashboard" class="sp-sidebar-brand">
			<div class="sp-brand-mark">SP</div>
			<span class="sp-brand-name">SveltePress</span>
		</a>

		<div class="sp-nav">
			<!-- Dashboard -->
			<div class="sp-nav-item">
				<a
					href="/sp-admin/dashboard"
					class="sp-nav-link"
					class:active={isExact('/sp-admin/dashboard')}
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<rect x="1" y="1" width="6" height="6" rx="1"/>
						<rect x="9" y="1" width="6" height="6" rx="1"/>
						<rect x="1" y="9" width="6" height="6" rx="1"/>
						<rect x="9" y="9" width="6" height="6" rx="1"/>
					</svg>
					Dashboard
				</a>
			</div>

			<div class="sp-nav-divider"></div>

			<!-- Posts -->
			<div class="sp-nav-item">
				<button
					class="sp-nav-link"
					class:active={isActive('/sp-admin/posts') || isActive('/sp-admin/categories') || isActive('/sp-admin/tags')}
					onclick={() => toggle('posts')}
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<path d="M2 2h12v1H2zm0 3h12v1H2zm0 3h8v1H2zm0 3h6v1H2z" opacity=".8"/>
						<rect x="1" y="1" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
					</svg>
					Posts
					<svg class="sp-nav-expand" class:open={expanded.posts} width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
						<path d="M2 3l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
					</svg>
				</button>
				{#if expanded.posts}
					<div class="sp-subnav">
						<a href="/sp-admin/posts" class="sp-subnav-link" class:active={isExact('/sp-admin/posts')}>All Posts</a>
						<a href="/sp-admin/posts/new" class="sp-subnav-link" class:active={isActive('/sp-admin/posts/new')}>Add New</a>
						<a href="/sp-admin/categories" class="sp-subnav-link" class:active={isActive('/sp-admin/categories')}>Categories</a>
						<a href="/sp-admin/tags" class="sp-subnav-link" class:active={isActive('/sp-admin/tags')}>Tags</a>
					</div>
				{/if}
			</div>

			<!-- Media -->
			<div class="sp-nav-item">
				<button
					class="sp-nav-link"
					class:active={isActive('/sp-admin/media')}
					onclick={() => toggle('media')}
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<rect x="1" y="3" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
						<circle cx="5" cy="6.5" r="1.5"/>
						<path d="M1 11l4-3 3 2.5 2.5-2 4.5 3.5" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
					Media
					<svg class="sp-nav-expand" class:open={expanded.media} width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
						<path d="M2 3l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
					</svg>
				</button>
				{#if expanded.media}
					<div class="sp-subnav">
						<a href="/sp-admin/media" class="sp-subnav-link" class:active={isExact('/sp-admin/media')}>Library</a>
						<a href="/sp-admin/media?upload=1" class="sp-subnav-link">Add New</a>
					</div>
				{/if}
			</div>

			<!-- Pages -->
			<div class="sp-nav-item">
				<button
					class="sp-nav-link"
					class:active={isActive('/sp-admin/pages')}
					onclick={() => toggle('pages')}
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<rect x="2" y="1" width="10" height="14" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
						<path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
						<path d="M12 1l2 2v11h-2" stroke="currentColor" stroke-width="1.2" fill="none"/>
					</svg>
					Pages
					<svg class="sp-nav-expand" class:open={expanded.pages} width="10" height="10" viewBox="0 0 10 10">
						<path d="M2 3l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
					</svg>
				</button>
				{#if expanded.pages}
					<div class="sp-subnav">
						<a href="/sp-admin/pages" class="sp-subnav-link" class:active={isExact('/sp-admin/pages')}>All Pages</a>
						<a href="/sp-admin/pages/new" class="sp-subnav-link" class:active={isActive('/sp-admin/pages/new')}>Add New</a>
					</div>
				{/if}
			</div>

			<!-- Comments -->
			<div class="sp-nav-item">
				<a
					href="/sp-admin/comments"
					class="sp-nav-link"
					class:active={isActive('/sp-admin/comments')}
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<path d="M2 2h12a1 1 0 011 1v8a1 1 0 01-1 1H5l-3 2V3a1 1 0 011-1z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
					</svg>
					Comments
					{#if data.pendingComments > 0}
						<span class="sp-count-badge warning" style="margin-left:auto">{data.pendingComments}</span>
					{/if}
				</a>
			</div>

			<div class="sp-nav-divider"></div>

			<!-- Appearance -->
			<div class="sp-nav-item">
				<button
					class="sp-nav-link"
					class:active={isActive('/sp-admin/themes') || isActive('/sp-admin/menus') || isActive('/sp-admin/widgets')}
					onclick={() => toggle('appearance')}
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
						<path d="M8 2a6 6 0 016 6" stroke="currentColor" stroke-width="1.5" fill="none"/>
						<circle cx="8" cy="8" r="2"/>
					</svg>
					Appearance
					<svg class="sp-nav-expand" class:open={expanded.appearance} width="10" height="10" viewBox="0 0 10 10">
						<path d="M2 3l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
					</svg>
				</button>
				{#if expanded.appearance}
					<div class="sp-subnav">
						<a href="/sp-admin/themes" class="sp-subnav-link" class:active={isActive('/sp-admin/themes')}>Themes</a>
						<a href="/sp-admin/menus" class="sp-subnav-link" class:active={isActive('/sp-admin/menus')}>Menus</a>
						<a href="/sp-admin/widgets" class="sp-subnav-link" class:active={isActive('/sp-admin/widgets')}>Widgets</a>
					</div>
				{/if}
			</div>

			<!-- Plugins -->
			<div class="sp-nav-item">
				<a
					href="/sp-admin/plugins"
					class="sp-nav-link"
					class:active={isActive('/sp-admin/plugins')}
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<path d="M6 2h4v3h3l-1.5 2.5 1.5 2.5H10v4H6V10H3L4.5 7.5 3 5h3V2z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
					</svg>
					Plugins
				</a>
			</div>

			<div class="sp-nav-divider"></div>

			<!-- Users -->
			<div class="sp-nav-item">
				<button
					class="sp-nav-link"
					class:active={isActive('/sp-admin/users') || isActive('/sp-admin/profile')}
					onclick={() => toggle('users')}
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<circle cx="8" cy="5" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
						<path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
					Users
					<svg class="sp-nav-expand" class:open={expanded.users} width="10" height="10" viewBox="0 0 10 10">
						<path d="M2 3l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
					</svg>
				</button>
				{#if expanded.users}
					<div class="sp-subnav">
						<a href="/sp-admin/users" class="sp-subnav-link" class:active={isExact('/sp-admin/users')}>All Users</a>
						<a href="/sp-admin/users/new" class="sp-subnav-link" class:active={isActive('/sp-admin/users/new')}>Add New</a>
						<a href="/sp-admin/profile" class="sp-subnav-link" class:active={isActive('/sp-admin/profile')}>Your Profile</a>
					</div>
				{/if}
			</div>

			<!-- Tools -->
			<div class="sp-nav-item">
				<button
					class="sp-nav-link"
					class:active={isActive('/sp-admin/tools')}
					onclick={() => toggle('tools')}
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<path d="M13.5 2.5l-2 2-1.5-1.5 2-2a3.5 3.5 0 00-4.5 4.5L2 11a1.5 1.5 0 002 2l5.5-5.5a3.5 3.5 0 004.5-4.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
					</svg>
					Tools
					<svg class="sp-nav-expand" class:open={expanded.tools} width="10" height="10" viewBox="0 0 10 10">
						<path d="M2 3l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
					</svg>
				</button>
				{#if expanded.tools}
					<div class="sp-subnav">
						<a href="/sp-admin/tools" class="sp-subnav-link" class:active={isExact('/sp-admin/tools')}>Import / Export</a>
					</div>
				{/if}
			</div>

			<!-- Settings -->
			<div class="sp-nav-item">
				<button
					class="sp-nav-link"
					class:active={isActive('/sp-admin/settings')}
					onclick={() => toggle('settings')}
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<circle cx="8" cy="8" r="2.5" fill="none" stroke="currentColor" stroke-width="1.4"/>
						<path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
					</svg>
					Settings
					<svg class="sp-nav-expand" class:open={expanded.settings} width="10" height="10" viewBox="0 0 10 10">
						<path d="M2 3l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
					</svg>
				</button>
				{#if expanded.settings}
					<div class="sp-subnav">
						<a href="/sp-admin/settings/general" class="sp-subnav-link" class:active={isActive('/sp-admin/settings/general')}>General</a>
						<a href="/sp-admin/settings/reading" class="sp-subnav-link" class:active={isActive('/sp-admin/settings/reading')}>Reading</a>
						<a href="/sp-admin/settings/writing" class="sp-subnav-link" class:active={isActive('/sp-admin/settings/writing')}>Writing</a>
						<a href="/sp-admin/settings/discussion" class="sp-subnav-link" class:active={isActive('/sp-admin/settings/discussion')}>Discussion</a>
						<a href="/sp-admin/settings/media" class="sp-subnav-link" class:active={isActive('/sp-admin/settings/media')}>Media</a>
						<a href="/sp-admin/settings/permalinks" class="sp-subnav-link" class:active={isActive('/sp-admin/settings/permalinks')}>Permalinks</a>
					</div>
				{/if}
			</div>
		</div>
	</nav>

	<!-- Admin Bar -->
	<header class="sp-adminbar">
		<div class="sp-adminbar-left">
			<button
				class="sp-user-btn"
				style="padding: 4px; border-radius: 3px;"
				onclick={() => (sidebarOpen = !sidebarOpen)}
				title="Toggle sidebar"
				aria-label="Toggle sidebar"
			>
				<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
					<rect x="2" y="4" width="14" height="1.5" rx=".75"/>
					<rect x="2" y="8.25" width="14" height="1.5" rx=".75"/>
					<rect x="2" y="12.5" width="14" height="1.5" rx=".75"/>
				</svg>
			</button>

			<a href={siteUrl} class="sp-site-name" target="_blank" title="Visit site">
				{siteName}
				<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style="opacity:.5; margin-left:2px; vertical-align:middle">
					<path d="M1 9L9 1M4 1h5v5" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</a>
		</div>

		<div class="sp-adminbar-right">
			<div class="sp-user-menu">
				<button class="sp-user-btn" onclick={() => (userMenuOpen = !userMenuOpen)}>
					<div class="sp-avatar">
						{#if data.user.avatar}
							<img src={data.user.avatar} alt={data.user.displayName} />
						{:else}
							{initials}
						{/if}
					</div>
					<span>{data.user.displayName}</span>
					<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
						<path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
					</svg>
				</button>

				{#if userMenuOpen}
					<div class="sp-dropdown">
						<a href="/sp-admin/profile">Edit Profile</a>
						<div class="sp-dropdown-divider"></div>
						<a href="/" target="_blank">Visit Site</a>
						<div class="sp-dropdown-divider"></div>
						<form method="POST" action="/sp-admin/logout" use:enhance>
							<button type="submit">Log Out</button>
						</form>
					</div>
				{/if}
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="sp-main">
		<div class="sp-content">
			{@render children()}
		</div>
	</main>
</div>
