<script lang="ts">
	import type { PageData } from './$types.js';
	import { formatDate } from '$lib/utils.js';

	let { data }: { data: PageData } = $props();

	let totalPages = $derived(Math.ceil(data.total / data.perPage));
	let searchValue = $state(data.query);
</script>

<svelte:head>
	{#if data.query}
		<title>Search results for &ldquo;{data.query}&rdquo; &ndash; {data.siteName}</title>
	{:else}
		<title>Search &ndash; {data.siteName}</title>
	{/if}
</svelte:head>

<div class="fp-search-page">
	<header class="fp-search-header">
		<h1 class="fp-search-title">Search</h1>
	</header>

	<form action="/search" method="get" class="fp-search-form">
		<div class="fp-search-input-wrap">
			<input
				type="search"
				name="q"
				bind:value={searchValue}
				placeholder="Search posts…"
				class="fp-search-input"
				aria-label="Search query"
				autofocus={!data.query}
			/>
			<button type="submit" class="fp-search-submit">Search</button>
		</div>
	</form>

	{#if data.query}
		<div class="fp-search-results">
			{#if data.total === 0}
				<p class="fp-search-no-results">
					No results found for <strong>&ldquo;{data.query}&rdquo;</strong>.
				</p>
				<p class="fp-search-suggestion">
					Try different keywords or browse by <a href="/">recent posts</a>.
				</p>
			{:else}
				<p class="fp-search-count">
					{data.total} {data.total === 1 ? 'result' : 'results'} for
					<strong>&ldquo;{data.query}&rdquo;</strong>
				</p>

				<div class="fp-post-list">
					{#each data.posts as post}
						<article class="fp-post-card">
							<header class="fp-post-card-header">
								<h2 class="fp-post-card-title">
									<a href="/{post.slug}" class="fp-post-card-link">{post.title || '(Untitled)'}</a>
								</h2>
								<div class="fp-post-meta">
									<time class="fp-post-date" datetime={post.postDate?.toISOString() ?? ''}>
										{formatDate(post.postDate)}
									</time>
									{#if post.authorName}
										<span class="fp-post-meta-sep">·</span>
										<a href="/author/{post.authorUsername}" class="fp-post-author">
											{post.authorName}
										</a>
									{/if}
								</div>
							</header>
							{#if post.excerpt}
								<div class="fp-post-excerpt">
									<p>{post.excerpt}</p>
								</div>
							{/if}
							<footer class="fp-post-card-footer">
								<a href="/{post.slug}" class="fp-read-more">
									Read post <span aria-hidden="true">&rarr;</span>
								</a>
							</footer>
						</article>
					{/each}
				</div>

				{#if totalPages > 1}
					<nav class="fp-pagination" aria-label="Search result pages">
						{#if data.page > 1}
							<a href="?q={encodeURIComponent(data.query)}&page={data.page - 1}" class="fp-page-btn">
								&larr; Previous
							</a>
						{/if}
						<span class="fp-page-info">Page {data.page} of {totalPages}</span>
						{#if data.page < totalPages}
							<a href="?q={encodeURIComponent(data.query)}&page={data.page + 1}" class="fp-page-btn">
								Next &rarr;
							</a>
						{/if}
					</nav>
				{/if}
			{/if}
		</div>
	{/if}
</div>

<style>
	.fp-search-page { max-width: 720px; }

	.fp-search-header {
		margin-bottom: 1.5rem;
	}

	.fp-search-title {
		font-family: 'Playfair Display', Georgia, serif;
		font-size: 2rem;
		font-weight: 700;
		color: #1d2327;
		letter-spacing: -0.02em;
	}

	.fp-search-form {
		margin-bottom: 2rem;
	}

	.fp-search-input-wrap {
		display: flex;
		gap: 0.5rem;
	}

	.fp-search-input {
		flex: 1;
		padding: 0.625rem 0.875rem;
		border: 2px solid #1d2327;
		border-radius: 4px;
		font-size: 1rem;
		font-family: inherit;
		color: #1d2327;
		outline: none;
		transition: border-color 0.15s;
	}

	.fp-search-input:focus {
		border-color: #2271b1;
	}

	.fp-search-submit {
		padding: 0.625rem 1.5rem;
		background: #1d2327;
		color: #fff;
		border: 2px solid #1d2327;
		border-radius: 4px;
		font-size: 1rem;
		font-family: inherit;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s;
		white-space: nowrap;
	}

	.fp-search-submit:hover {
		background: #2271b1;
		border-color: #2271b1;
	}

	.fp-search-count {
		font-size: 0.9375rem;
		color: #646970;
		margin-bottom: 1.5rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid #e8e8e8;
	}

	.fp-search-no-results {
		font-size: 1rem;
		color: #1d2327;
		margin-bottom: 0.5rem;
	}

	.fp-search-suggestion {
		font-size: 0.875rem;
		color: #646970;
	}

	.fp-post-list { display: flex; flex-direction: column; }

	.fp-post-card {
		padding: 1.75rem 0;
		border-bottom: 1px solid #e8e8e8;
	}

	.fp-post-card:first-child { padding-top: 0; }

	.fp-post-card-header { margin-bottom: 0.625rem; }

	.fp-post-card-title {
		font-family: 'Playfair Display', Georgia, serif;
		font-size: 1.4rem;
		font-weight: 700;
		line-height: 1.25;
		letter-spacing: -0.02em;
		margin-bottom: 0.4rem;
	}

	.fp-post-card-link { color: #1d2327; text-decoration: none; }
	.fp-post-card-link:hover { color: #2271b1; }

	.fp-post-meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.25rem;
		font-size: 0.8125rem;
		color: #646970;
	}

	.fp-post-date { color: #646970; }
	.fp-post-meta-sep { color: #c3c4c7; }

	.fp-post-author { color: #646970; text-decoration: none; }
	.fp-post-author:hover { color: #2271b1; }

	.fp-post-excerpt { color: #3c434a; line-height: 1.7; margin-bottom: 1rem; }

	.fp-post-card-footer { display: flex; }

	.fp-read-more { font-size: 0.875rem; font-weight: 500; color: #2271b1; text-decoration: none; }
	.fp-read-more:hover { text-decoration: underline; }

	.fp-pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 2rem 0 0;
		border-top: 1px solid #e8e8e8;
		margin-top: 1rem;
	}

	.fp-page-btn {
		font-size: 0.875rem;
		font-weight: 500;
		color: #2271b1;
		text-decoration: none;
		padding: 0.5rem 1rem;
		border: 1px solid #2271b1;
		border-radius: 4px;
		transition: background 0.15s, color 0.15s;
	}

	.fp-page-btn:hover { background: #2271b1; color: #fff; }

	.fp-page-info { font-size: 0.875rem; color: #646970; }
</style>
