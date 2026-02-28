<script lang="ts">
	import type { PageData } from './$types.js';
	import { formatDate, getPermalinkUrl } from '$lib/utils.js';

	let { data }: { data: PageData } = $props();

	let totalPages = $derived(Math.ceil(data.total / data.perPage));

	function postUrl(post: { id: number; slug: string; postDate: Date | null | undefined }): string {
		return getPermalinkUrl(post, data.permalinkStructure ?? '/%postname%/');
	}
</script>

<svelte:head>
	<title>Tag: {data.tag.name} &ndash; {data.siteName}</title>
	{#if data.tag.description}
		<meta name="description" content={data.tag.description} />
	{/if}
</svelte:head>

<div class="fp-archive">
	<header class="fp-archive-header">
		<div class="fp-archive-label">Tag</div>
		<h1 class="fp-archive-title">#{data.tag.name}</h1>
		{#if data.tag.description}
			<p class="fp-archive-description">{data.tag.description}</p>
		{/if}
		<p class="fp-archive-count">{data.total} {data.total === 1 ? 'post' : 'posts'}</p>
	</header>

	{#if data.posts.length === 0}
		<div class="fp-empty">
			<p>No posts found with this tag.</p>
		</div>
	{:else}
		<div class="fp-post-list">
			{#each data.posts as post}
				<article class="fp-post-card">
					<header class="fp-post-card-header">
						<h2 class="fp-post-card-title">
							<a href={postUrl(post)} class="fp-post-card-link">{post.title || '(Untitled)'}</a>
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
							{#if post.categories.length > 0}
								<span class="fp-post-meta-sep">·</span>
								<span>
									{#each post.categories as cat, i}
										<a href="/category/{cat.slug}" class="fp-post-cat">{cat.name}</a>{#if i < post.categories.length - 1}, {/if}
									{/each}
								</span>
							{/if}
						</div>
					</header>
					{#if post.excerpt}
						<div class="fp-post-excerpt">
							<p>{post.excerpt}</p>
						</div>
					{/if}
					<footer class="fp-post-card-footer">
						<a href={postUrl(post)} class="fp-read-more">
							Continue reading <span aria-hidden="true">&rarr;</span>
						</a>
						{#if post.commentCount > 0}
							<a href="{postUrl(post)}#comments" class="fp-comment-count">
								{post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
							</a>
						{/if}
					</footer>
				</article>
			{/each}
		</div>

		{#if totalPages > 1}
			<nav class="fp-pagination" aria-label="Page navigation">
				{#if data.page > 1}
					<a href="?page={data.page - 1}" class="fp-page-btn">&larr; Newer</a>
				{/if}
				<span class="fp-page-info">Page {data.page} of {totalPages}</span>
				{#if data.page < totalPages}
					<a href="?page={data.page + 1}" class="fp-page-btn">Older &rarr;</a>
				{/if}
			</nav>
		{/if}
	{/if}
</div>

<style>
	.fp-archive { max-width: 720px; }

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

	.fp-archive-description {
		color: #3c434a;
		margin-bottom: 0.5rem;
		line-height: 1.6;
	}

	.fp-archive-count { font-size: 0.8125rem; color: #646970; }

	.fp-empty { padding: 2rem 0; color: #646970; }

	.fp-post-list { display: flex; flex-direction: column; }

	.fp-post-card {
		padding: 2rem 0;
		border-bottom: 1px solid #e8e8e8;
	}

	.fp-post-card:first-child { padding-top: 0; }

	.fp-post-card-header { margin-bottom: 0.75rem; }

	.fp-post-card-title {
		font-family: 'Playfair Display', Georgia, serif;
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1.25;
		letter-spacing: -0.02em;
		margin-bottom: 0.5rem;
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

	.fp-post-cat { color: #646970; text-decoration: none; }
	.fp-post-cat:hover { color: #2271b1; }

	.fp-post-excerpt { color: #3c434a; line-height: 1.7; margin-bottom: 1rem; }

	.fp-post-card-footer { display: flex; align-items: center; gap: 1.25rem; }

	.fp-read-more { font-size: 0.875rem; font-weight: 500; color: #2271b1; text-decoration: none; }
	.fp-read-more:hover { text-decoration: underline; }

	.fp-comment-count { font-size: 0.8125rem; color: #646970; text-decoration: none; }
	.fp-comment-count:hover { color: #2271b1; }

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
