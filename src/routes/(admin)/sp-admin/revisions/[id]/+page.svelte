<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate } from '$lib/utils.js';
	import type { PageData, ActionData } from './$types.js';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	// Slider index: 0 = current post state, 1..N = revisions ordered newest-first
	// Index 0 = current (post), index 1 = data.allRevisions[0], etc.
	let sliderIndex = $state(1); // default: show selected revision vs current

	// Find the index of the loaded revision in allRevisions
	const loadedRevisionIndex = $derived(
		data.allRevisions.findIndex((r) => r.id === data.revision.id)
	);

	// "Before" = older (right side of slider, higher index in sorted-desc array)
	// "After"  = newer (left side of slider, lower index in sorted-desc array)
	// We compare: current post vs the selected revision
	// sliderIndex: 0 = compare post vs revision[0], 1 = compare revision[0] vs revision[1], etc.

	const totalComparisons = $derived(data.allRevisions.length); // number of revision-to-revision comparisons (or post-to-revision)

	// "Before" state: older of the two compared
	const beforeState = $derived(
		sliderIndex >= data.allRevisions.length
			? null
			: data.allRevisions[sliderIndex]
	);

	// "After" state: newer of the two compared (sliderIndex - 1, or current post if 0)
	const afterState = $derived(
		sliderIndex === 0
			? { title: data.post.title, content: data.post.content, createdAt: data.post.modifiedDate }
			: data.allRevisions[sliderIndex - 1]
	);

	const selectedRevision = $derived(data.allRevisions[sliderIndex] ?? data.allRevisions[0]);

	let restoring = $state(false);
</script>

<svelte:head>
	<title>Compare Revisions — SveltePress</title>
</svelte:head>

<div class="sp-page-header" style="display:flex; align-items:center; justify-content:space-between;">
	<h1 class="sp-page-title">Compare Revisions</h1>
	<a href="/sp-admin/posts/{data.post.id}" class="sp-btn sp-btn-secondary sp-btn-sm">
		&larr; Back to Post
	</a>
</div>

{#if form?.error}
	<div class="sp-notice sp-notice-error">{form.error}</div>
{/if}

<!-- Post info -->
<div class="sp-card" style="margin-bottom:16px;">
	<div class="sp-card-body" style="padding:12px 16px;">
		<span style="font-size:13px; color:var(--sp-text-muted);">Post:</span>
		<strong style="font-size:13px; margin-left:6px;">{data.post.title || '(no title)'}</strong>
		<span style="font-size:12px; color:var(--sp-text-muted); margin-left:12px;">
			{data.allRevisions.length} revision{data.allRevisions.length !== 1 ? 's' : ''}
		</span>
	</div>
</div>

<!-- Slider -->
<div class="sp-card" style="margin-bottom:20px;">
	<div class="sp-card-body">
		<div style="display:flex; align-items:center; gap:16px; margin-bottom:12px;">
			<label class="sp-label" style="white-space:nowrap; margin:0;">Compare revisions:</label>
			<input
				type="range"
				min="0"
				max={data.allRevisions.length - 1}
				step="1"
				bind:value={sliderIndex}
				style="flex:1;"
			/>
		</div>
		<div style="display:flex; justify-content:space-between; font-size:12px; color:var(--sp-text-muted);">
			<span>Oldest</span>
			<span>Newest</span>
		</div>
		{#if data.allRevisions.length > 0}
			<div style="margin-top:10px; font-size:12px; color:var(--sp-text-muted); text-align:center;">
				Showing revision from
				<strong>{formatDate(data.allRevisions[sliderIndex]?.createdAt ?? data.allRevisions[0].createdAt)}</strong>
			</div>
		{/if}
	</div>
</div>

<!-- Two-column diff -->
<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
	<!-- Before (older) -->
	<div class="sp-card">
		<div class="sp-card-header" style="background:#fff8f8;">
			<h2 class="sp-card-title" style="color:#c00;">
				Before
				{#if beforeState}
					<span style="font-size:12px; font-weight:normal; color:var(--sp-text-muted);">
						— {formatDate((beforeState as { createdAt: Date | null }).createdAt)}
					</span>
				{:else}
					<span style="font-size:12px; font-weight:normal; color:var(--sp-text-muted);">— (no older revision)</span>
				{/if}
			</h2>
		</div>
		<div class="sp-card-body">
			{#if beforeState}
				<div style="margin-bottom:12px;">
					<label class="sp-label" style="font-size:11px;">Title</label>
					<div style="font-size:14px; font-weight:500; padding:6px; background:#fff0f0; border-radius:3px; border:1px solid #fcc;">
						{(beforeState as { title: string }).title || '(no title)'}
					</div>
				</div>
				<div>
					<label class="sp-label" style="font-size:11px;">Content (JSON blocks)</label>
					<pre style="font-size:11px; background:#fff0f0; border:1px solid #fcc; padding:10px; border-radius:3px; overflow-x:auto; white-space:pre-wrap; max-height:300px; overflow-y:auto;">{JSON.stringify((beforeState as { content: unknown }).content, null, 2)}</pre>
				</div>
			{:else}
				<p style="color:var(--sp-text-muted); font-size:13px; font-style:italic;">No older revision to compare.</p>
			{/if}
		</div>
	</div>

	<!-- After (newer) -->
	<div class="sp-card">
		<div class="sp-card-header" style="background:#f0fff0;">
			<h2 class="sp-card-title" style="color:#090;">
				After
				{#if afterState}
					<span style="font-size:12px; font-weight:normal; color:var(--sp-text-muted);">
						— {formatDate((afterState as { createdAt: Date | null }).createdAt)}
					</span>
				{/if}
			</h2>
		</div>
		<div class="sp-card-body">
			{#if afterState}
				<div style="margin-bottom:12px;">
					<label class="sp-label" style="font-size:11px;">Title</label>
					<div style="font-size:14px; font-weight:500; padding:6px; background:#f0fff0; border-radius:3px; border:1px solid #9c9;">
						{(afterState as { title: string }).title || '(no title)'}
					</div>
				</div>
				<div>
					<label class="sp-label" style="font-size:11px;">Content (JSON blocks)</label>
					<pre style="font-size:11px; background:#f0fff0; border:1px solid #9c9; padding:10px; border-radius:3px; overflow-x:auto; white-space:pre-wrap; max-height:300px; overflow-y:auto;">{JSON.stringify((afterState as { content: unknown }).content, null, 2)}</pre>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Restore action -->
<div class="sp-card">
	<div class="sp-card-body" style="display:flex; align-items:center; gap:16px;">
		<div style="flex:1;">
			<p style="font-size:13px; margin:0;">
				Restore the post to the state from
				<strong>{formatDate(data.revision.createdAt)}</strong>.
				The current version will be saved as a new revision before restoring.
			</p>
		</div>
		<form
			method="POST"
			action="?/restore"
			use:enhance={() => {
				restoring = true;
				return async ({ update }) => {
					await update();
					restoring = false;
				};
			}}
		>
			<button
				type="submit"
				class="sp-btn sp-btn-primary"
				disabled={restoring}
				onclick={(e) => {
					if (!confirm('Restore this revision? The current post content will be saved as a new revision.')) {
						e.preventDefault();
					}
				}}
			>
				{restoring ? 'Restoring…' : 'Restore This Revision'}
			</button>
		</form>
	</div>
</div>

<!-- Revision list -->
<div class="sp-card" style="margin-top:20px;">
	<div class="sp-card-header">
		<h2 class="sp-card-title">All Revisions</h2>
	</div>
	<div class="sp-card-body" style="padding:0;">
		{#each data.allRevisions as rev, i}
			<div
				style="display:flex; align-items:center; gap:12px; padding:10px 16px; border-bottom:1px solid var(--sp-border); background:{rev.id === data.revision.id ? '#f0f9ff' : '#fff'};"
			>
				<div style="flex:1;">
					<div style="font-size:13px; font-weight:{rev.id === data.revision.id ? '600' : '400'};">
						{rev.title || '(no title)'}
						{#if rev.id === data.revision.id}
							<span style="font-size:11px; background:var(--sp-primary); color:#fff; padding:1px 6px; border-radius:10px; margin-left:6px;">Current</span>
						{/if}
					</div>
					<div style="font-size:12px; color:var(--sp-text-muted);">{formatDate(rev.createdAt)}</div>
				</div>
				<a
					href="/sp-admin/revisions/{rev.id}"
					class="sp-btn sp-btn-secondary sp-btn-sm"
				>
					{rev.id === data.revision.id ? 'Viewing' : 'View'}
				</a>
			</div>
		{/each}
	</div>
</div>
