<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types.js';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
	<link rel="stylesheet" href={data.themeCssUrl} />
</svelte:head>

<div class="fp-site" data-theme={data.themeSlug}>
	<header class="fp-header">
		<div class="fp-header-inner">
			<div class="fp-branding">
				<a href="/" class="fp-site-name">{data.siteName}</a>
				{#if data.siteDescription}
					<p class="fp-site-description">{data.siteDescription}</p>
				{/if}
			</div>

			{#if data.menuItems.length > 0}
				<nav class="fp-nav" aria-label="Primary navigation">
					<ul class="fp-nav-list">
						{#each data.menuItems.filter((i) => !i.parentId) as item}
							<li class="fp-nav-item">
								<a
									href={item.url}
									class="fp-nav-link"
									target={item.target || undefined}
									rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
								>
									{item.title}
								</a>
							</li>
						{/each}
					</ul>
				</nav>
			{:else}
				<nav class="fp-nav" aria-label="Primary navigation">
					<ul class="fp-nav-list">
						<li class="fp-nav-item"><a href="/" class="fp-nav-link">Home</a></li>
					</ul>
				</nav>
			{/if}

			<div class="fp-header-search">
				<form action="/search" method="get" class="fp-search-form">
					<input
						type="search"
						name="q"
						placeholder="Search…"
						class="fp-search-input"
						aria-label="Search"
					/>
					<button type="submit" class="fp-search-btn" aria-label="Submit search">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="11" cy="11" r="8"/>
							<path d="m21 21-4.35-4.35"/>
						</svg>
					</button>
				</form>
			</div>
		</div>
	</header>

	<div class="fp-wrap">
		<main class="fp-main" id="main-content">
			{@render children()}
		</main>

		<aside class="fp-sidebar">
			<div class="fp-widget">
				<h3 class="fp-widget-title">Search</h3>
				<form action="/search" method="get" class="fp-search-form">
					<input
						type="search"
						name="q"
						placeholder="Search posts…"
						class="fp-search-input fp-search-input--full"
						aria-label="Search"
					/>
					<button type="submit" class="fp-widget-search-btn">Search</button>
				</form>
			</div>

			<div class="fp-widget">
				<h3 class="fp-widget-title">Categories</h3>
				{#if data.sidebarCategories && data.sidebarCategories.length > 0}
					<ul class="fp-archive-list">
						{#each data.sidebarCategories as cat}
							<li class="fp-archive-item">
								<a href="/category/{cat.slug}" class="fp-archive-link">{cat.name}</a>
								<span class="fp-archive-count-badge">({cat.count})</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="fp-widget-placeholder"><a href="/">Browse posts</a></p>
				{/if}
			</div>

			{#if data.archiveMonths && data.archiveMonths.length > 0}
				<div class="fp-widget">
					<h3 class="fp-widget-title">Archives</h3>
					<ul class="fp-archive-list">
						{#each data.archiveMonths as entry}
							<li class="fp-archive-item">
								<a
									href="/{entry.year}/{entry.month}"
									class="fp-archive-link"
								>
									{new Date(Number(entry.year), Number(entry.month) - 1, 1).toLocaleString('default', { month: 'long' })}
									{entry.year}
								</a>
								<span class="fp-archive-count-badge">({entry.count})</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</aside>
	</div>

	<footer class="fp-footer">
		<div class="fp-footer-inner">
			<p class="fp-footer-copy">
				{#if data.siteDescription}
					<span class="fp-footer-description">{data.siteDescription}</span>
					&mdash;
				{/if}
				&copy; {new Date().getFullYear()} {data.siteName}
			</p>
			<p class="fp-footer-links">
				<a href="/">Home</a>
				<a href="/search">Search</a>
				<a href="/sp-admin/dashboard">Admin</a>
			</p>
		</div>
	</footer>
</div>

<style>
	/* ── Google Fonts are loaded via <svelte:head> ── */

	:global(*) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(body) {
		font-family: var(--theme-font-body, 'Inter', system-ui, sans-serif);
		font-size: 16px;
		line-height: 1.6;
		color: var(--theme-color-text, #1d2327);
		background: var(--theme-color-bg, #fff);
		-webkit-font-smoothing: antialiased;
	}

	:global(a) {
		color: var(--theme-color-text, #1d2327);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	:global(a:hover) {
		color: var(--theme-color-accent, #2271b1);
	}

	:global(img) {
		max-width: 100%;
		height: auto;
		display: block;
	}

	/* ── Header ── */
	.fp-header {
		border-bottom: 1px solid var(--theme-color-border, #e8e8e8);
		background: var(--theme-color-bg, #fff);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.fp-header-inner {
		max-width: var(--theme-max-width, 1100px);
		margin: 0 auto;
		padding: 0 1.5rem;
		display: flex;
		align-items: center;
		gap: 2rem;
		min-height: 64px;
	}

	.fp-branding {
		flex-shrink: 0;
	}

	.fp-site-name {
		font-family: var(--theme-font-heading, 'Playfair Display', Georgia, serif);
		font-size: 1.35rem;
		font-weight: 700;
		color: var(--theme-color-text, #1d2327);
		text-decoration: none;
		letter-spacing: -0.01em;
	}

	.fp-site-name:hover {
		color: var(--theme-color-accent, #2271b1);
	}

	.fp-site-description {
		font-size: 0.75rem;
		color: #646970;
		margin-top: 1px;
		display: none;
	}

	/* ── Navigation ── */
	.fp-nav {
		flex: 1;
	}

	.fp-nav-list {
		list-style: none;
		display: flex;
		gap: 0.25rem;
	}

	.fp-nav-link {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--theme-color-text, #1d2327);
		text-decoration: none;
		padding: 0.375rem 0.75rem;
		border-radius: 4px;
		transition: background 0.15s;
	}

	.fp-nav-link:hover {
		background: var(--theme-color-surface, #f0f0f1);
		color: var(--theme-color-text, #1d2327);
	}

	/* ── Header Search ── */
	.fp-header-search {
		flex-shrink: 0;
	}

	.fp-search-form {
		display: flex;
		gap: 0.25rem;
	}

	.fp-search-input {
		padding: 0.375rem 0.625rem;
		border: 1px solid #c3c4c7;
		border-radius: 4px;
		font-size: 0.875rem;
		font-family: inherit;
		width: 160px;
		outline: none;
		transition: border-color 0.15s;
	}

	.fp-search-input:focus {
		border-color: var(--theme-color-accent, #2271b1);
	}

	.fp-search-input--full {
		width: 100%;
	}

	.fp-search-btn {
		background: none;
		border: 1px solid #c3c4c7;
		border-radius: 4px;
		padding: 0.375rem 0.5rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		color: #646970;
		transition: border-color 0.15s, color 0.15s;
	}

	.fp-search-btn:hover {
		border-color: var(--theme-color-accent, #2271b1);
		color: var(--theme-color-accent, #2271b1);
	}

	/* ── Layout ── */
	.fp-wrap {
		max-width: var(--theme-max-width, 1100px);
		margin: 0 auto;
		padding: 2.5rem 1.5rem;
		display: grid;
		grid-template-columns: 1fr var(--theme-sidebar-width, 280px);
		gap: 3rem;
	}

	.fp-main {
		min-width: 0;
	}

	/* ── Sidebar ── */
	.fp-sidebar {
		min-width: 0;
	}

	.fp-widget {
		margin-bottom: 2rem;
	}

	.fp-widget-title {
		font-family: var(--theme-font-heading, 'Playfair Display', Georgia, serif);
		font-size: 1rem;
		font-weight: 700;
		color: var(--theme-color-text, #1d2327);
		border-bottom: 2px solid var(--theme-color-text, #1d2327);
		padding-bottom: 0.5rem;
		margin-bottom: 1rem;
	}

	.fp-widget-placeholder {
		font-size: 0.875rem;
		color: #646970;
	}

	.fp-widget-search-btn {
		margin-top: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--theme-color-text, #1d2327);
		color: #fff;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.15s;
		width: 100%;
	}

	.fp-widget-search-btn:hover {
		background: var(--theme-color-accent, #2271b1);
	}

	/* ── Archives widget ── */
	.fp-archive-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.fp-archive-item {
		display: flex;
		align-items: baseline;
		gap: 0.375rem;
		font-size: 0.875rem;
	}

	.fp-archive-link {
		color: var(--theme-color-text, #1d2327);
		text-decoration: none;
	}

	.fp-archive-link:hover {
		color: var(--theme-color-accent, #2271b1);
		text-decoration: underline;
	}

	.fp-archive-count-badge {
		font-size: 0.75rem;
		color: #646970;
	}

	/* ── Footer ── */
	.fp-footer {
		border-top: 1px solid var(--theme-color-border, #e8e8e8);
		background: var(--theme-color-bg, #fff);
		margin-top: 2rem;
	}

	.fp-footer-inner {
		max-width: var(--theme-max-width, 1100px);
		margin: 0 auto;
		padding: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.fp-footer-copy {
		font-size: 0.875rem;
		color: var(--theme-color-muted, #646970);
	}

	.fp-footer-description {
		font-style: italic;
	}

	.fp-footer-links {
		display: flex;
		gap: 1.25rem;
		font-size: 0.875rem;
		list-style: none;
	}

	.fp-footer-links a {
		color: var(--theme-color-muted, #646970);
		text-decoration: none;
	}

	.fp-footer-links a:hover {
		color: var(--theme-color-accent, #2271b1);
	}

	@media (max-width: 768px) {
		.fp-wrap {
			grid-template-columns: 1fr;
		}

		.fp-sidebar {
			order: 2;
		}

		.fp-header-inner {
			flex-wrap: wrap;
			gap: 0.75rem;
			padding: 0.75rem 1rem;
		}

		.fp-header-search {
			display: none;
		}
	}
</style>
