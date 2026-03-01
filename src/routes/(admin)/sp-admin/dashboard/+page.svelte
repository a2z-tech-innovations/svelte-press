<script lang="ts">
	import { enhance } from '$app/forms';
	import { timeAgo, truncate } from '$lib/utils.js';

	let { data, form }: {
		data: {
			stats: {
				totalPosts: number;
				totalPages: number;
				totalComments: number;
				pendingComments: number;
				totalUsers: number;
				totalMedia: number;
			};
			recentPosts: Array<{ id: number; title: string; status: string; postDate: Date | null; modifiedDate: Date; authorName: string | null }>;
			recentComments: Array<{ id: number; content: string; authorName: string; date: Date; status: string; postId: number; postTitle: string | null }>;
			siteName: string;
			siteDescription: string;
		};
		form?: { quickDraftSuccess?: boolean; quickDraftError?: string } | null;
	} = $props();

	let quickDraftTitle = $state('');
	let quickDraftContent = $state('');
	let quickDraftSubmitting = $state(false);
	let showWelcome = $state(true);

	$effect(() => {
		if (form?.quickDraftSuccess) {
			quickDraftTitle = '';
			quickDraftContent = '';
		}
	});
</script>

<svelte:head>
	<title>Dashboard — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Dashboard</h1>
</div>

{#if showWelcome}
	<div class="sp-card" style="margin-bottom: 20px; border-left: 4px solid var(--sp-primary);">
		<div class="sp-card-body" style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px;">
			<div>
				<h2 style="font-size:16px; font-weight:600; margin:0 0 6px; color:var(--sp-text)">
					Welcome to SveltePress!
				</h2>
				<p style="color:var(--sp-text-muted); margin:0 0 12px; font-size:13px">
					{data.siteDescription || 'Your site is ready. Here are some things you can do:'}
				</p>
				<div style="display:flex; gap:8px; flex-wrap:wrap;">
					<a href="/sp-admin/posts/new" class="sp-btn sp-btn-primary sp-btn-sm">Write your first post</a>
					<a href="/sp-admin/pages/new" class="sp-btn sp-btn-secondary sp-btn-sm">Create a page</a>
					<a href="/sp-admin/settings/general" class="sp-btn sp-btn-secondary sp-btn-sm">Customize settings</a>
					<a href="/sp-admin/themes" class="sp-btn sp-btn-secondary sp-btn-sm">Choose a theme</a>
				</div>
			</div>
			<button
				onclick={() => (showWelcome = false)}
				style="background:none;border:none;color:var(--sp-text-muted);cursor:pointer;font-size:18px;line-height:1;padding:0;flex-shrink:0"
				title="Dismiss"
			>×</button>
		</div>
	</div>
{/if}

<div class="sp-grid-2" style="gap:20px; align-items:start;">
	<!-- Left column -->
	<div style="display:flex; flex-direction:column; gap:20px;">
		<!-- At a Glance -->
		<div class="sp-card">
			<div class="sp-card-header">
				<h2 class="sp-card-title">At a Glance</h2>
			</div>
			<div class="sp-card-body" style="padding:0;">
				<div style="display:grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid var(--sp-border);">
					{#each [
						{ label: data.stats.totalPosts === 1 ? 'Post' : 'Posts', count: data.stats.totalPosts, href: '/sp-admin/posts', icon: '📝' },
						{ label: data.stats.totalPages === 1 ? 'Page' : 'Pages', count: data.stats.totalPages, href: '/sp-admin/pages', icon: '📄' },
						{ label: data.stats.totalComments === 1 ? 'Comment' : 'Comments', count: data.stats.totalComments, href: '/sp-admin/comments', icon: '💬' },
						{ label: data.stats.totalMedia === 1 ? 'Media File' : 'Media Files', count: data.stats.totalMedia, href: '/sp-admin/media', icon: '🖼️' },
						{ label: data.stats.totalUsers === 1 ? 'User' : 'Users', count: data.stats.totalUsers, href: '/sp-admin/users', icon: '👥' },
					] as stat}
						<a
							href={stat.href}
							style="display:flex; align-items:center; gap:10px; padding:12px 16px; text-decoration:none; border-bottom:1px solid var(--sp-border); transition:background 0.1s;"
							onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background = '#f6f7f7'}
							onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = ''}
						>
							<span style="font-size:18px">{stat.icon}</span>
							<div>
								<div style="font-size:22px; font-weight:300; color:var(--sp-text); line-height:1">{stat.count}</div>
								<div style="font-size:12px; color:var(--sp-text-muted)">{stat.label}</div>
							</div>
						</a>
					{/each}

					{#if data.stats.pendingComments > 0}
						<a
							href="/sp-admin/comments?status=pending"
							style="display:flex; align-items:center; gap:10px; padding:12px 16px; text-decoration:none; background:#fff8e5; border-bottom:1px solid var(--sp-border);"
						>
							<span style="font-size:18px">⏳</span>
							<div>
								<div style="font-size:22px; font-weight:300; color:var(--sp-warning); line-height:1">{data.stats.pendingComments}</div>
								<div style="font-size:12px; color:var(--sp-text-muted)">Pending</div>
							</div>
						</a>
					{/if}
				</div>

				<div style="padding: 10px 16px; font-size:12px; color:var(--sp-text-muted);">
					<span style="color:var(--sp-success)">●</span> Running SveltePress 1.0.0
				</div>
			</div>
		</div>

		<!-- Quick Draft -->
		<div class="sp-card">
			<div class="sp-card-header">
				<h2 class="sp-card-title">Quick Draft</h2>
				<a href="/sp-admin/posts" style="font-size:12px; color:var(--sp-primary); text-decoration:none;">View all drafts</a>
			</div>
			<div class="sp-card-body">
				{#if form?.quickDraftSuccess}
					<div class="sp-notice sp-notice-success" style="margin-bottom:12px;">
						Draft saved! <a href="/sp-admin/posts?status=draft" style="color:var(--sp-primary)">Manage drafts →</a>
					</div>
				{/if}
				{#if form?.quickDraftError}
					<div class="sp-notice sp-notice-error" style="margin-bottom:12px;">{form.quickDraftError}</div>
				{/if}

				<form
					method="POST"
					action="?/quickdraft"
					use:enhance={() => {
						quickDraftSubmitting = true;
						return async ({ update }) => {
							await update();
							quickDraftSubmitting = false;
						};
					}}
				>
					<div class="sp-field">
						<input
							type="text"
							name="title"
							class="sp-input"
							placeholder="Title"
							bind:value={quickDraftTitle}
							required
						/>
					</div>
					<div class="sp-field">
						<textarea
							name="content"
							class="sp-textarea"
							placeholder="What's on your mind?"
							bind:value={quickDraftContent}
							style="min-height:100px"
						></textarea>
					</div>
					<button type="submit" class="sp-btn sp-btn-primary" disabled={quickDraftSubmitting}>
						{quickDraftSubmitting ? 'Saving…' : 'Save Draft'}
					</button>
				</form>
			</div>
		</div>
	</div>

	<!-- Right column -->
	<div style="display:flex; flex-direction:column; gap:20px;">
		<!-- Recent Activity -->
		<div class="sp-card">
			<div class="sp-card-header">
				<h2 class="sp-card-title">Recent Activity</h2>
			</div>
			<div class="sp-card-body" style="padding:0;">
				{#if data.recentPosts.length === 0 && data.recentComments.length === 0}
					<div style="padding:20px 16px; text-align:center; color:var(--sp-text-muted); font-size:13px;">
						No activity yet. <a href="/sp-admin/posts/new" style="color:var(--sp-primary)">Write your first post.</a>
					</div>
				{:else}
					<div>
						{#if data.recentPosts.length > 0}
							<div style="padding:10px 16px 6px; font-size:11px; font-weight:600; color:var(--sp-text-muted); text-transform:uppercase; letter-spacing:0.5px;">
								Recent Posts
							</div>
							{#each data.recentPosts as post}
								<div style="display:flex; align-items:center; gap:10px; padding:8px 16px; border-bottom:1px solid #f0f0f1;">
									<span style="font-size:18px; flex-shrink:0;">
										{post.status === 'publish' ? '✅' : post.status === 'draft' ? '✏️' : '🔒'}
									</span>
									<div style="min-width:0; flex:1">
										<a
											href="/sp-admin/posts/{post.id}"
											style="display:block; color:var(--sp-text); text-decoration:none; font-weight:500; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"
										>
											{post.title || '(no title)'}
										</a>
										<div style="font-size:11px; color:var(--sp-text-muted);">
											{post.authorName} · {timeAgo(post.modifiedDate)}
										</div>
									</div>
									<span style="font-size:11px; color:var(--sp-text-muted); flex-shrink:0; text-transform:capitalize;">{post.status}</span>
								</div>
							{/each}
						{/if}

						{#if data.recentComments.length > 0}
							<div style="padding:10px 16px 6px; font-size:11px; font-weight:600; color:var(--sp-text-muted); text-transform:uppercase; letter-spacing:0.5px;">
								Recent Comments
							</div>
							{#each data.recentComments as comment}
								<div style="display:flex; align-items:flex-start; gap:10px; padding:8px 16px; border-bottom:1px solid #f0f0f1;">
									<span style="font-size:16px; flex-shrink:0; margin-top:2px;">
										{comment.status === 'approved' ? '💬' : '⏳'}
									</span>
									<div style="min-width:0; flex:1">
										<div style="font-size:13px; color:var(--sp-text);">
											<strong>{comment.authorName}</strong>
											{#if comment.postTitle}
												on <a href="/sp-admin/posts/{comment.postId}" style="color:var(--sp-primary); text-decoration:none;">{comment.postTitle}</a>
											{/if}
										</div>
										<div style="font-size:12px; color:var(--sp-text-muted); margin-top:2px;">
											{truncate(comment.content, 80)}
										</div>
										<div style="font-size:11px; color:var(--sp-text-muted); margin-top:2px;">{timeAgo(comment.date)}</div>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
