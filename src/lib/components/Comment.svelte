<script lang="ts">
	import Comment from './Comment.svelte';
	import type { CommentNode } from '$lib/types/index.js';

	let {
		comment,
		depth = 0,
		onreply
	}: {
		comment: CommentNode;
		depth?: number;
		onreply?: (id: number, name: string) => void;
	} = $props();

	let indentPx = $derived(Math.min(depth, 3) * 32);
</script>

<div
	class="fp-comment"
	class:fp-comment-reply={depth > 0}
	style="margin-left: {indentPx}px"
	id="comment-{comment.id}"
>
	<div class="fp-comment-avatar">
		<img src={comment.avatarUrl} alt={comment.authorName} width="48" height="48" />
	</div>
	<div class="fp-comment-body">
		<div class="fp-comment-meta">
			{#if comment.authorUrl}
				<a href={comment.authorUrl} class="fp-comment-author" rel="nofollow ugc" target="_blank">
					{comment.authorName}
				</a>
			{:else}
				<span class="fp-comment-author">{comment.authorName}</span>
			{/if}
			{#if comment.date}
				<time
					class="fp-comment-date"
					datetime={comment.date instanceof Date ? comment.date.toISOString() : String(comment.date)}
				>
					{new Date(comment.date).toLocaleDateString('en-US', {
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					})}
				</time>
			{/if}
			{#if onreply}
				<button
					type="button"
					class="fp-comment-reply-btn"
					onclick={() => onreply!(comment.id, comment.authorName)}
				>
					Reply
				</button>
			{/if}
		</div>
		<div class="fp-comment-content">
			<p>{comment.content}</p>
		</div>
	</div>
</div>

{#each comment.children as child}
	<Comment comment={child} depth={depth + 1} {onreply} />
{/each}

<style>
	.fp-comment {
		display: flex;
		gap: 1rem;
		padding: 1.25rem 0;
		border-bottom: 1px solid #e8e8e8;
	}

	.fp-comment-avatar img {
		border-radius: 50%;
		display: block;
	}

	.fp-comment-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.fp-comment-author {
		font-weight: 600;
		font-size: 0.9rem;
		color: #1d2327;
		text-decoration: none;
	}

	.fp-comment-author:hover {
		color: #2271b1;
	}

	.fp-comment-date {
		font-size: 0.8rem;
		color: #646970;
	}

	.fp-comment-content p {
		font-size: 0.9375rem;
		line-height: 1.7;
		color: #1d2327;
	}

	.fp-comment-reply-btn {
		background: none;
		border: none;
		padding: 0;
		font-size: 0.75rem;
		color: #2271b1;
		cursor: pointer;
		font-family: inherit;
		text-decoration: underline;
		margin-left: 4px;
	}

	.fp-comment-reply-btn:hover {
		color: #135e96;
	}

	.fp-comment-reply {
		border-left: 2px solid #c3c4c7;
		padding-left: 16px;
	}
</style>
