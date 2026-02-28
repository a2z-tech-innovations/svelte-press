<script lang="ts">
	import type { PageData, ActionData } from './$types.js';
	import { formatDate } from '$lib/utils.js';
	import { enhance } from '$app/forms';
	import Comment from '$lib/components/Comment.svelte';
	import GalleryLightbox from '$lib/components/GalleryLightbox.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Block renderer
	function renderBlock(block: { id?: string; type: string; content: string; attrs: Record<string, unknown> }): string {
		switch (block.type) {
			case 'paragraph':
				return '<p>' + block.content + '</p>';
			case 'heading': {
				const level = Number(block.attrs.level) || 2;
				return '<h' + level + '>' + block.content + '</h' + level + '>';
			}
			case 'image':
				return '<figure><img src="' + block.attrs.src + '" alt="' + (block.attrs.alt || '') + '" /></figure>';
			case 'gallery': {
				const imgs = Array.isArray(block.attrs.images) ? block.attrs.images : [];
				if (imgs.length === 0) return '';
				const blockId = block.id ?? '';
				const thumbs = (imgs as Array<{ src: string; alt?: string; caption?: string }>)
					.map((img, idx) => {
						const caption = img.caption
							? '<span class="sp-gallery-grid-caption">' + img.caption + '</span>'
							: '';
						return (
							'<button type="button" class="sp-gallery-grid-btn"' +
							' data-sp-gallery-id="' + blockId + '"' +
							' data-sp-gallery-index="' + idx + '"' +
							' aria-label="View image ' + (idx + 1) + ' of ' + imgs.length + '">' +
							'<img src="' + img.src + '" alt="' + (img.alt ?? '') + '" class="sp-gallery-grid-img" loading="lazy" />' +
							caption +
							'</button>'
						);
					})
					.join('');
				return '<div class="sp-gallery-grid" data-sp-gallery="' + blockId + '">' + thumbs + '</div>';
			}
			case 'quote':
				return '<blockquote>' + block.content + '</blockquote>';
			case 'list':
				return '<' + (block.attrs.ordered ? 'ol' : 'ul') + '>' + block.content + '</' + (block.attrs.ordered ? 'ol' : 'ul') + '>';
			case 'separator':
				return '<hr />';
			case 'code':
				return '<pre><code>' + block.content + '</code></pre>';
			case 'html':
				return block.content;
			case 'embed': {
				const embedHtml = String(block.attrs.embedHtml ?? '');
				const embedUrl = String(block.attrs.url ?? '');
				if (embedHtml) {
					return '<div class="wp-embed-block">' + embedHtml + '</div>';
				}
				if (embedUrl) {
					return '<div class="wp-embed-block"><a href="' + embedUrl + '" target="_blank" rel="noopener noreferrer">' + embedUrl + '</a></div>';
				}
				return '';
			}
			default:
				return block.content ? '<p>' + block.content + '</p>' : '';
		}
	}

	function renderBlocks(blocks: unknown[]): string {
		if (!Array.isArray(blocks)) return '';
		return blocks
			.map((b) => {
				const block = b as { id?: string; type: string; content: string; attrs: Record<string, unknown> };
				return renderBlock(block);
			})
			.join('\n');
	}

	let renderedContent = $derived(renderBlocks(data.post.content));
	let isPost = $derived(data.post.postType === 'post');

	// Collect gallery blocks so GalleryLightbox can access image data
	let galleryBlocks = $derived(
		Array.isArray(data.post.content)
			? (data.post.content as Array<{ id: string; type: string; attrs: Record<string, unknown> }>).filter(
					(b) => b.type === 'gallery'
				)
			: []
	);

	let commentName = $state('');
	let commentEmail = $state('');
	let commentUrl = $state('');
	let commentContent = $state('');
	let replyToId = $state<number | null>(null);
	let replyToName = $state<string | null>(null);

	$effect(() => {
		if (form?.success) {
			commentName = '';
			commentEmail = '';
			commentUrl = '';
			commentContent = '';
			replyToId = null;
			replyToName = null;
		}
	});

	function handleReply(id: number, name: string) {
		replyToId = id;
		replyToName = name;
		// Scroll to the comment form
		const el = document.getElementById('comment-form');
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	function cancelReply() {
		replyToId = null;
		replyToName = null;
	}

	// Use commentTree if available, fall back gracefully
	let commentTree = $derived(data.commentTree ?? []);
</script>

<svelte:head>
	<title>{data.post.title || 'Post'} &ndash; {data.siteName}</title>
	{#if data.post.excerpt}
		<meta name="description" content={data.post.excerpt} />
	{/if}
</svelte:head>

<article class="fp-single">
	<header class="fp-single-header">
		<h1 class="fp-single-title">{data.post.title || '(Untitled)'}</h1>

		{#if isPost}
			<div class="fp-single-meta">
				<time class="fp-single-date" datetime={data.post.postDate?.toISOString() ?? ''}>
					{formatDate(data.post.postDate)}
				</time>
				{#if data.post.authorName}
					<span class="fp-meta-sep">·</span>
					<a href="/author/{data.post.authorUsername}" class="fp-single-author">
						{data.post.authorName}
					</a>
				{/if}
				{#if data.categories.length > 0}
					<span class="fp-meta-sep">·</span>
					<span>
						{#each data.categories as cat, i}
							<a href="/category/{cat.slug}" class="fp-cat-link">{cat.name}</a>{#if i < data.categories.length - 1}, {/if}
						{/each}
					</span>
				{/if}
			</div>
		{/if}
	</header>

	<div class="fp-single-content">
		{@html renderedContent}
	</div>

	{#if isPost && data.tags.length > 0}
		<footer class="fp-single-footer">
			<div class="fp-tags">
				<span class="fp-tags-label">Tags:</span>
				{#each data.tags as tag}
					<a href="/tag/{tag.slug}" class="fp-tag">{tag.name}</a>
				{/each}
			</div>
		</footer>
	{/if}

	{#if isPost && data.post.authorName}
		<div class="fp-author-box">
			<img
				src={data.post.authorAvatarUrl}
				alt={data.post.authorName}
				class="fp-author-avatar"
				width="72"
				height="72"
			/>
			<div class="fp-author-info">
				<a href="/author/{data.post.authorUsername}" class="fp-author-name">
					{data.post.authorName}
				</a>
				{#if data.post.authorBio}
					<p class="fp-author-bio">{data.post.authorBio}</p>
				{/if}
			</div>
		</div>
	{/if}
</article>

<!-- Lightbox for gallery blocks — mounts outside article to avoid z-index issues -->
{#if galleryBlocks.length > 0}
	<GalleryLightbox galleries={galleryBlocks} />
{/if}

{#if isPost}
	<section class="fp-comments" id="comments">
		<h2 class="fp-comments-title">
			{#if data.comments.length === 0}
				No comments yet
			{:else}
				{data.comments.length}
				{data.comments.length === 1 ? 'Comment' : 'Comments'}
			{/if}
		</h2>

		{#if commentTree.length > 0}
			<div class="fp-comment-list">
				{#each commentTree as comment}
					<Comment {comment} depth={0} onreply={handleReply} />
				{/each}
			</div>
		{/if}

		{#if data.post.commentStatus === 'open'}
			<div class="fp-comment-form-wrap" id="comment-form">
				<h3 class="fp-comment-form-title">
					{replyToId ? `Reply to ${replyToName}` : 'Leave a Comment'}
				</h3>

				{#if replyToId}
					<div class="fp-reply-indicator">
						Replying to <strong>{replyToName}</strong> —
						<button type="button" class="fp-cancel-reply" onclick={cancelReply}>Cancel</button>
					</div>
				{/if}

				{#if form?.success}
					<div class="fp-notice fp-notice--success">
						{form.message ?? 'Your comment has been submitted and is awaiting moderation.'}
					</div>
				{:else if form?.error}
					<div class="fp-notice fp-notice--error">{form.error}</div>
				{/if}

				<form
					method="post"
					action="?/comment"
					class="fp-comment-form"
					use:enhance
				>
					<input type="hidden" name="parentId" value={replyToId ?? ''} />
					<div class="fp-form-row">
						<div class="fp-form-field">
							<label for="comment-name" class="fp-form-label">Name <span aria-hidden="true">*</span></label>
							<input
								id="comment-name"
								type="text"
								name="name"
								bind:value={commentName}
								required
								class="fp-form-input"
								autocomplete="name"
							/>
						</div>
						<div class="fp-form-field">
							<label for="comment-email" class="fp-form-label">Email <span aria-hidden="true">*</span></label>
							<input
								id="comment-email"
								type="email"
								name="email"
								bind:value={commentEmail}
								required
								class="fp-form-input"
								autocomplete="email"
							/>
							<p class="fp-form-hint">Your email will not be published.</p>
						</div>
					</div>

					<div class="fp-form-field">
						<label for="comment-url" class="fp-form-label">Website</label>
						<input
							id="comment-url"
							type="url"
							name="url"
							bind:value={commentUrl}
							class="fp-form-input"
							autocomplete="url"
						/>
					</div>

					<div class="fp-form-field">
						<label for="comment-content" class="fp-form-label">Comment <span aria-hidden="true">*</span></label>
						<textarea
							id="comment-content"
							name="content"
							bind:value={commentContent}
							required
							rows="6"
							class="fp-form-textarea"
						></textarea>
					</div>

					<button type="submit" class="fp-form-submit">Post Comment</button>
				</form>
			</div>
		{:else}
			<p class="fp-comments-closed">Comments are closed.</p>
		{/if}
	</section>
{/if}

<style>
	/* ── Single post ── */
	.fp-single {
		max-width: 720px;
	}

	.fp-single-header {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid #e8e8e8;
	}

	.fp-single-title {
		font-family: 'Playfair Display', Georgia, serif;
		font-size: 2.25rem;
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: -0.03em;
		color: #1d2327;
		margin-bottom: 0.75rem;
	}

	.fp-single-meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.25rem;
		font-size: 0.8125rem;
		color: #646970;
	}

	.fp-single-date {
		color: #646970;
	}

	.fp-meta-sep {
		color: #c3c4c7;
	}

	.fp-single-author {
		color: #646970;
		text-decoration: none;
	}

	.fp-single-author:hover {
		color: #2271b1;
	}

	.fp-cat-link {
		color: #646970;
		text-decoration: none;
	}

	.fp-cat-link:hover {
		color: #2271b1;
	}

	/* ── Content ── */
	.fp-single-content {
		line-height: 1.8;
		color: #1d2327;
	}

	.fp-single-content :global(p) {
		margin-bottom: 1.5rem;
	}

	.fp-single-content :global(h1),
	.fp-single-content :global(h2),
	.fp-single-content :global(h3),
	.fp-single-content :global(h4),
	.fp-single-content :global(h5),
	.fp-single-content :global(h6) {
		font-family: 'Playfair Display', Georgia, serif;
		font-weight: 700;
		line-height: 1.3;
		margin: 2rem 0 0.75rem;
		color: #1d2327;
	}

	.fp-single-content :global(h2) { font-size: 1.6rem; letter-spacing: -0.02em; }
	.fp-single-content :global(h3) { font-size: 1.3rem; }
	.fp-single-content :global(h4) { font-size: 1.1rem; }

	.fp-single-content :global(blockquote) {
		border-left: 3px solid #1d2327;
		padding-left: 1.25rem;
		margin: 1.5rem 0;
		color: #3c434a;
		font-style: italic;
		font-size: 1.05rem;
	}

	.fp-single-content :global(pre) {
		background: #f6f7f7;
		border: 1px solid #e8e8e8;
		border-radius: 4px;
		padding: 1rem 1.25rem;
		overflow-x: auto;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
	}

	.fp-single-content :global(code) {
		font-family: 'Fira Code', 'Cascadia Code', Consolas, monospace;
		font-size: 0.875em;
	}

	.fp-single-content :global(ul),
	.fp-single-content :global(ol) {
		margin-bottom: 1.5rem;
		padding-left: 1.5rem;
	}

	.fp-single-content :global(li) {
		margin-bottom: 0.25rem;
	}

	.fp-single-content :global(figure) {
		margin: 1.5rem 0;
	}

	.fp-single-content :global(figure img) {
		border-radius: 4px;
		width: 100%;
	}

	.fp-single-content :global(hr) {
		border: none;
		border-top: 1px solid #e8e8e8;
		margin: 2rem 0;
	}

	.fp-single-content :global(a) {
		color: #2271b1;
	}

	/* ── Post footer / tags ── */
	.fp-single-footer {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e8e8e8;
	}

	.fp-tags {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.fp-tags-label {
		font-size: 0.8125rem;
		color: #646970;
		font-weight: 500;
	}

	.fp-tag {
		display: inline-block;
		padding: 0.2rem 0.6rem;
		border: 1px solid #c3c4c7;
		border-radius: 2rem;
		font-size: 0.75rem;
		color: #646970;
		text-decoration: none;
		transition: border-color 0.15s, color 0.15s;
	}

	.fp-tag:hover {
		border-color: #2271b1;
		color: #2271b1;
	}

	/* ── Author box ── */
	.fp-author-box {
		display: flex;
		gap: 1.25rem;
		align-items: flex-start;
		margin-top: 2.5rem;
		padding: 1.5rem;
		background: #f6f7f7;
		border-radius: 6px;
	}

	.fp-author-avatar {
		border-radius: 50%;
		flex-shrink: 0;
	}

	.fp-author-name {
		display: block;
		font-family: 'Playfair Display', Georgia, serif;
		font-size: 1rem;
		font-weight: 700;
		color: #1d2327;
		text-decoration: none;
		margin-bottom: 0.25rem;
	}

	.fp-author-name:hover {
		color: #2271b1;
	}

	.fp-author-bio {
		font-size: 0.875rem;
		color: #3c434a;
		line-height: 1.6;
	}

	/* ── Comments ── */
	.fp-comments {
		max-width: 720px;
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 2px solid #1d2327;
	}

	.fp-comments-title {
		font-family: 'Playfair Display', Georgia, serif;
		font-size: 1.5rem;
		font-weight: 700;
		color: #1d2327;
		margin-bottom: 1.5rem;
	}

	.fp-comment-list {
		padding: 0;
		margin-bottom: 2rem;
	}

	.fp-comments-closed {
		font-size: 0.875rem;
		color: #646970;
		font-style: italic;
	}

	/* ── Comment form ── */
	.fp-comment-form-wrap {
		margin-top: 2rem;
	}

	.fp-reply-indicator {
		background: #f0f0f1;
		border-left: 3px solid #2271b1;
		padding: 8px 12px;
		font-size: 0.8125rem;
		margin-bottom: 12px;
		border-radius: 0 4px 4px 0;
		color: #3c434a;
	}

	.fp-cancel-reply {
		background: none;
		border: none;
		padding: 0;
		color: #2271b1;
		cursor: pointer;
		font-size: 0.8125rem;
		font-family: inherit;
		text-decoration: underline;
	}

	.fp-cancel-reply:hover {
		color: #d63638;
	}

	.fp-comment-form-title {
		font-family: 'Playfair Display', Georgia, serif;
		font-size: 1.25rem;
		font-weight: 700;
		margin-bottom: 1.25rem;
	}

	.fp-notice {
		padding: 0.875rem 1rem;
		border-radius: 4px;
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}

	.fp-notice--success {
		background: #edfaef;
		border: 1px solid #00a32a;
		color: #004a12;
	}

	.fp-notice--error {
		background: #fceaea;
		border: 1px solid #d63638;
		color: #6d0d0f;
	}

	.fp-form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.fp-form-field {
		margin-bottom: 1rem;
	}

	.fp-form-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: #1d2327;
		margin-bottom: 0.375rem;
	}

	.fp-form-label span {
		color: #d63638;
	}

	.fp-form-input,
	.fp-form-textarea {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid #c3c4c7;
		border-radius: 4px;
		font-size: 0.9375rem;
		font-family: inherit;
		color: #1d2327;
		outline: none;
		transition: border-color 0.15s;
	}

	.fp-form-input:focus,
	.fp-form-textarea:focus {
		border-color: #2271b1;
	}

	.fp-form-textarea {
		resize: vertical;
		min-height: 120px;
	}

	.fp-form-hint {
		font-size: 0.75rem;
		color: #646970;
		margin-top: 0.25rem;
	}

	.fp-form-submit {
		padding: 0.625rem 1.5rem;
		background: #1d2327;
		color: #fff;
		border: none;
		border-radius: 4px;
		font-size: 0.9375rem;
		font-family: inherit;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s;
	}

	.fp-form-submit:hover {
		background: #2271b1;
	}

	@media (max-width: 600px) {
		.fp-single-title {
			font-size: 1.75rem;
		}

		.fp-form-row {
			grid-template-columns: 1fr;
		}
	}
</style>
