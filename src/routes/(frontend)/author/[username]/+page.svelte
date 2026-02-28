<script lang="ts">
	import type { PageData } from './$types.js';
	import { formatDate, getMediaUrl } from '$lib/utils.js';

	let { data }: { data: PageData } = $props();

	let totalPages = $derived(Math.ceil(data.total / data.perPage));

	let avatarSrc = $derived(
		data.author.avatar
			? getMediaUrl(data.author.avatar)
			: data.author.gravatarUrl
	);
</script>

<svelte:head>
	<title>{data.author.displayName} &ndash; {data.siteName}</title>
	{#if data.author.bio}
		<meta name="description" content={data.author.bio} />
	{/if}
</svelte:head>

<div class="fp-author-page">
	<header class="fp-author-header">
		<div class="fp-author-profile">
			<img
				src={avatarSrc}
				alt={data.author.displayName}
				class="fp-author-avatar"
				width="96"
				height="96"
			/>
			<div class="fp-author-details">
				<h1 class="fp-author-name">{data.author.displayName}</h1>
				<p class="fp-author-username">@{data.author.username}</p>
				{#if data.author.bio}
					<p class="fp-author-bio">{data.author.bio}</p>
				{/if}
				<p class="fp-author-stats">
					{data.postCount} published {data.postCount === 1 ? 'post' : 'posts'}
				</p>
			</div>
		</div>
	</header>

	<div class="fp-author-posts">
		{#if data.posts.length === 0}
			<div class="fp-empty">
				<p>No published posts yet.</p>
			</div>
		{:else}
			<h2 class="fp-author-posts-title">Posts by {data.author.displayName}</h2>

			<div class="fp-post-list">
				{#each data.posts as post}
					<article class="fp-post-card">
						<header class="fp-post-card-header">
							<h3 class="fp-post-card-title">
								<a href="/{post.slug}" class="fp-post-card-link">{post.title || '(Untitled)'}</a>
							</h3>
							<div class="fp-post-meta">
								<time class="fp-post-date" datetime={post.postDate?.toISOString() ?? ''}>
									{formatDate(post.postDate)}
								</time>
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
							<a href="/{post.slug}" class="fp-read-more">
								Continue reading <span aria-hidden="true">&rarr;</span>
							</a>
							{#if post.commentCount > 0}
								<a href="/{post.slug}#comments" class="fp-comment-count">
									{post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
								</a>
							{/if}
						</footer>
					</article>
				{/each}
			</div>

			{#if totalPages > 1}
				<nav class="fp-pagination" aria-label="Author posts pages">
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
</div>

<style>
	.fp-author-page { max-width: 720px; }

	.fp-author-header {
		margin-bottom: 2.5rem;
		padding-bottom: 2rem;
		border-bottom: 2px solid #1d2327;
	}

	.fp-author-profile {
		display: flex;
		gap: 1.5rem;
		align-items: flex-start;
	}

	.fp-author-avatar {
		border-radius: 50%;
		flex-shrink: 0;
		border: 3px solid #e8e8e8;
	}

	.fp-author-details {
		flex: 1;
		min-width: 0;
	}

	.fp-author-name {
		font-family: 'Playfair Display', Georgia, serif;
		font-size: 1.75rem;
		font-weight: 700;
		color: #1d2327;
		letter-spacing: -0.02em;
		margin-bottom: 0.125rem;
	}

	.fp-author-username {
		font-size: 0.875rem;
		color: #646970;
		margin-bottom: 0.75rem;
	}

	.fp-author-bio {
		font-size: 0.9375rem;
		color: #3c434a;
		line-height: 1.65;
		margin-bottom: 0.75rem;
	}

	.fp-author-stats {
		font-size: 0.8125rem;
		color: #646970;
	}

	.fp-author-posts-title {
		font-family: 'Playfair Display', Georgia, serif;
		font-size: 1.25rem;
		font-weight: 700;
		color: #1d2327;
		margin-bottom: 0.5rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #e8e8e8;
	}

	.fp-empty { padding: 2rem 0; color: #646970; }

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

	@media (max-width: 500px) {
		.fp-author-profile {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}
	}
</style>
