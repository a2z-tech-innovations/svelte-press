<script lang="ts">
	import type { PageData } from './$types.js';
	import { formatDate } from '$lib/utils.js';

	let { data }: { data: PageData } = $props();

	let totalPages = $derived(Math.ceil(data.total / data.perPage));
</script>

<svelte:head>
	<title>Archive: {data.archiveTitle} &ndash; {data.siteName}</title>
	<meta name="description" content="Posts published in {data.archiveTitle}" />
</svelte:head>

<div class="fp-archive">
	<header class="fp-archive-header">
		<div class="fp-archive-label">Archive</div>
		<h1 class="fp-archive-title">{data.archiveTitle}</h1>
		<p class="fp-archive-count">{data.total} {data.total === 1 ? 'post' : 'posts'}</p>
	</header>

	{#if data.archivePosts.length === 0}
		<div class="fp-empty">
			<p>No posts found for this period.</p>
			<a href="/" class="fp-back-home">Back to home</a>
		</div>
	{:else}
		<div class="fp-post-list">
			{#each data.archivePosts as post}
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
							Continue reading <span aria-hidden="true">&rarr;</span>
						</a>
					</footer>
				</article>
			{/each}
		</div>

		{#if totalPages > 1}
			<nav class="fp-pagination" aria-label="Page navigation">
				{#if data.page > 1}
					<a href="?page={data.page - 1}" class="fp-page-btn">
						&larr; Newer
					</a>
				{/if}
				<span class="fp-page-info">Page {data.page} of {totalPages}</span>
				{#if data.page < totalPages}
					<a href="?page={data.page + 1}" class="fp-page-btn">
						Older &rarr;
					</a>
				{/if}
			</nav>
		{/if}
	{/if}
</div>

<style>
	.fp-archive {
		max-width: 720px;
	}

	.fp-archive-header {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 2px solid #1d2327;
	}

	.fp-archive-label {
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #646970;
		margin-bottom: 0.375rem;
	}

	.fp-archive-title {
		font-family: 'Playfair Display', Georgia, serif;
		font-size: 2rem;
		font-weight: 700;
		color: #1d2327;
		letter-spacing: -0.02em;
		margin-bottom: 0.5rem;
	}

	.fp-archive-count {
		font-size: 0.8125rem;
		color: #646970;
	}

	.fp-empty {
		padding: 2rem 0;
		color: #646970;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.fp-back-home {
		font-size: 0.875rem;
		font-weight: 500;
		color: #2271b1;
		text-decoration: none;
	}

	.fp-back-home:hover {
		text-decoration: underline;
	}

	.fp-post-list {
		display: flex;
		flex-direction: column;
	}

	.fp-post-card {
		padding: 2rem 0;
		border-bottom: 1px solid #e8e8e8;
	}

	.fp-post-card:first-child {
		padding-top: 0;
	}

	.fp-post-card-header {
		margin-bottom: 0.75rem;
	}

	.fp-post-card-title {
		font-family: 'Playfair Display', Georgia, serif;
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1.25;
		letter-spacing: -0.02em;
		margin-bottom: 0.5rem;
	}

	.fp-post-card-link {
		color: #1d2327;
		text-decoration: none;
	}

	.fp-post-card-link:hover {
		color: #2271b1;
	}

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

	.fp-post-author {
		color: #646970;
		text-decoration: none;
	}

	.fp-post-author:hover { color: #2271b1; }

	.fp-post-excerpt {
		color: #3c434a;
		line-height: 1.7;
		margin-bottom: 1rem;
	}

	.fp-post-card-footer {
		display: flex;
		align-items: center;
		gap: 1.25rem;
	}

	.fp-read-more {
		font-size: 0.875rem;
		font-weight: 500;
		color: #2271b1;
		text-decoration: none;
	}

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

	.fp-page-btn:hover {
		background: #2271b1;
		color: #fff;
	}

	.fp-page-info {
		font-size: 0.875rem;
		color: #646970;
	}
</style>
