<script lang="ts">
	import { enhance } from '$app/forms';

	import type { PageData, ActionData } from './$types.js';
	let { data, form }: { data: PageData; form?: ActionData } = $props();

	const o = data.opts;
	let showOnFront = $state(o['show_on_front'] ?? 'posts');
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Reading Settings — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Reading Settings</h1>
</div>

{#if form?.success}
	<div class="sp-notice sp-notice-success">Settings saved.</div>
{/if}

<form method="POST" action="?/save" use:enhance={() => { submitting = true; return async ({ update }) => { await update({ reset: false }); submitting = false; }; }}>
	<table class="sp-settings-table">
		<tbody>
			<tr>
				<th>Your homepage displays</th>
				<td>
					<label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:10px;">
						<input type="radio" name="show_on_front" value="posts" bind:group={showOnFront} />
						Your latest posts
					</label>
					<label style="display:flex;align-items:center;gap:8px;font-size:13px;">
						<input type="radio" name="show_on_front" value="page" bind:group={showOnFront} />
						A static page
					</label>
					{#if showOnFront === 'page'}
						<div style="margin-top:10px; padding-left:24px; display:grid; grid-template-columns:140px 1fr; gap:10px 12px; align-items:center;">
							<label class="sp-label">Homepage:</label>
							<select name="page_on_front" class="sp-select">
								<option value="">— Select —</option>
								{#each data.pages as pg}
									<option value={pg.id} selected={o['page_on_front'] === String(pg.id)}>{pg.title || '(no title)'}</option>
								{/each}
							</select>
							<label class="sp-label">Posts page:</label>
							<select name="page_for_posts" class="sp-select">
								<option value="">— Select —</option>
								{#each data.pages as pg}
									<option value={pg.id} selected={o['page_for_posts'] === String(pg.id)}>{pg.title || '(no title)'}</option>
								{/each}
							</select>
						</div>
					{/if}
				</td>
			</tr>
			<tr>
				<th><label class="sp-label" for="posts_per_page">Blog pages show at most</label></th>
				<td>
					<div style="display:flex;align-items:center;gap:8px;">
						<input type="number" id="posts_per_page" name="posts_per_page" class="sp-input" value={o['posts_per_page'] ?? '10'} min="1" max="100" style="width:80px;" />
						<span style="font-size:13px;">posts</span>
					</div>
				</td>
			</tr>
			<tr>
				<th><label class="sp-label" for="posts_per_rss">Syndication feeds show the most recent</label></th>
				<td>
					<div style="display:flex;align-items:center;gap:8px;">
						<input type="number" id="posts_per_rss" name="posts_per_rss" class="sp-input" value={o['posts_per_rss'] ?? '10'} min="1" max="100" style="width:80px;" />
						<span style="font-size:13px;">items</span>
					</div>
				</td>
			</tr>
			<tr>
				<th>For each article in a feed, include</th>
				<td>
					<label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:6px;">
						<input type="radio" name="rss_use_excerpt" value="0" checked={o['rss_use_excerpt'] !== '1'} />
						Full text
					</label>
					<label style="display:flex;align-items:center;gap:8px;font-size:13px;">
						<input type="radio" name="rss_use_excerpt" value="1" checked={o['rss_use_excerpt'] === '1'} />
						Excerpt
					</label>
				</td>
			</tr>
		</tbody>
	</table>

	<p style="margin-top:20px;">
		<button type="submit" class="sp-btn sp-btn-primary" disabled={submitting}>
			{submitting ? 'Saving…' : 'Save Changes'}
		</button>
	</p>
</form>
