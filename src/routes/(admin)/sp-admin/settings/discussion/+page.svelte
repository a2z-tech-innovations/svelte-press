<script lang="ts">
	import { enhance } from '$app/forms';

	import type { PageData, ActionData } from './$types.js';
	let { data, form }: { data: PageData; form?: ActionData } = $props();

	const o = data.opts;
	let submitting = $state(false);

	function checked(key: string) {
		return o[key] === '1';
	}
</script>

<svelte:head>
	<title>Discussion Settings — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Discussion Settings</h1>
</div>

{#if form?.success}
	<div class="sp-notice sp-notice-success">Settings saved.</div>
{/if}

<form method="POST" action="?/save" use:enhance={() => { submitting = true; return async ({ update }) => { await update({ reset: false }); submitting = false; }; }}>
	<!-- Default Article Settings -->
	<div class="sp-card" style="margin-bottom:16px;">
		<div class="sp-card-header"><h2 class="sp-card-title">Default Article Settings</h2></div>
		<div class="sp-card-body">
			<label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:8px;">
				<input type="checkbox" name="default_pingback_flag" value="1" checked={checked('default_pingback_flag')} />
				Attempt to notify any blogs linked to from the article
			</label>
			<label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:8px;">
				<input type="checkbox" name="default_ping_status" value="1" checked={checked('default_ping_status')} />
				Allow link notifications from other blogs (pingbacks and trackbacks) on new articles
			</label>
			<label style="display:flex;align-items:center;gap:8px;font-size:13px;">
				<input type="checkbox" name="default_comment_status" value="1" checked={checked('default_comment_status')} />
				Allow people to submit comments on new articles
			</label>
		</div>
	</div>

	<!-- Other Comment Settings -->
	<div class="sp-card" style="margin-bottom:16px;">
		<div class="sp-card-header"><h2 class="sp-card-title">Other Comment Settings</h2></div>
		<div class="sp-card-body">
			<label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:8px;">
				<input type="checkbox" name="require_name_email" value="1" checked={checked('require_name_email')} />
				Comment author must fill out name and email
			</label>
			<label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:8px;">
				<input type="checkbox" name="comment_registration" value="1" checked={checked('comment_registration')} />
				Users must be registered and logged in to comment
			</label>
			<label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:8px;">
				<input type="checkbox" name="close_comments_for_old_posts" value="1" checked={checked('close_comments_for_old_posts')} />
				Automatically close comments on articles older than
				<input type="number" name="close_comments_days_old" class="sp-input" value={o['close_comments_days_old'] ?? '14'} style="width:60px;" min="1" />
				days
			</label>
			<label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:8px;">
				<input type="checkbox" name="thread_comments" value="1" checked={checked('thread_comments')} />
				Enable threaded (nested) comments
				<input type="number" name="thread_comments_depth" class="sp-input" value={o['thread_comments_depth'] ?? '5'} style="width:60px;" min="2" max="10" />
				levels deep
			</label>
			<label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:8px;">
				<input type="checkbox" name="page_comments" value="1" checked={checked('page_comments')} />
				Break comments into pages with
				<input type="number" name="comments_per_page" class="sp-input" value={o['comments_per_page'] ?? '50'} style="width:60px;" min="1" />
				top-level comments per page and the
				<select name="default_comments_page" class="sp-select" style="width:auto">
					<option value="last" selected={o['default_comments_page'] !== 'first'}>last</option>
					<option value="first" selected={o['default_comments_page'] === 'first'}>first</option>
				</select>
				page displayed by default
			</label>
			<label style="display:flex;align-items:center;gap:8px;font-size:13px;">
				Comments should be displayed with the
				<select name="comment_order" class="sp-select" style="width:auto">
					<option value="asc" selected={o['comment_order'] !== 'desc'}>older</option>
					<option value="desc" selected={o['comment_order'] === 'desc'}>newer</option>
				</select>
				comments at the top of each page
			</label>
		</div>
	</div>

	<!-- Email Me Whenever -->
	<div class="sp-card" style="margin-bottom:16px;">
		<div class="sp-card-header"><h2 class="sp-card-title">Email Me Whenever</h2></div>
		<div class="sp-card-body">
			<label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:8px;">
				<input type="checkbox" name="comments_notify" value="1" checked={checked('comments_notify')} />
				Anyone posts a comment
			</label>
			<label style="display:flex;align-items:center;gap:8px;font-size:13px;">
				<input type="checkbox" name="moderation_notify" value="1" checked={checked('moderation_notify')} />
				A comment is held for moderation
			</label>
		</div>
	</div>

	<!-- Before a Comment Appears -->
	<div class="sp-card" style="margin-bottom:16px;">
		<div class="sp-card-header"><h2 class="sp-card-title">Before a Comment Appears</h2></div>
		<div class="sp-card-body">
			<label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:8px;">
				<input type="checkbox" name="comment_moderation" value="1" checked={checked('comment_moderation')} />
				Comment must be manually approved
			</label>
			<label style="display:flex;align-items:center;gap:8px;font-size:13px;">
				<input type="checkbox" name="comment_whitelist" value="1" checked={checked('comment_whitelist')} />
				Comment author must have a previously approved comment
			</label>
		</div>
	</div>

	<!-- Comment Moderation -->
	<div class="sp-card" style="margin-bottom:16px;">
		<div class="sp-card-header"><h2 class="sp-card-title">Comment Moderation</h2></div>
		<div class="sp-card-body">
			<div class="sp-field">
				<label class="sp-label" for="moderation_keys">
					Hold a comment in the queue if it contains
					<input type="number" class="sp-input" value="2" style="width:60px;margin:0 4px;" />
					or more links.
				</label>
				<p style="font-size:12px;color:var(--sp-text-muted);margin-bottom:8px;">
					When a comment contains any of these words in its content, name, URL, email, or IP, it will be held in the moderation queue. One word or IP per line.
				</p>
				<textarea id="moderation_keys" name="moderation_keys" class="sp-textarea" value={o['moderation_keys'] ?? ''} style="min-height:120px;width:100%;max-width:600px;font-family:monospace;font-size:12px;"></textarea>
			</div>
		</div>
	</div>

	<!-- Disallowed Comment Keys -->
	<div class="sp-card" style="margin-bottom:16px;">
		<div class="sp-card-header"><h2 class="sp-card-title">Disallowed Comment Keys</h2></div>
		<div class="sp-card-body">
			<div class="sp-field">
				<p style="font-size:12px;color:var(--sp-text-muted);margin-bottom:8px;">
					When a comment contains any of these words it will be put in the trash. One word or IP per line.
				</p>
				<textarea name="blacklist_keys" class="sp-textarea" value={o['blacklist_keys'] ?? ''} style="min-height:120px;width:100%;max-width:600px;font-family:monospace;font-size:12px;"></textarea>
			</div>
		</div>
	</div>

	<!-- Avatars -->
	<div class="sp-card" style="margin-bottom:16px;">
		<div class="sp-card-header"><h2 class="sp-card-title">Avatars</h2></div>
		<div class="sp-card-body">
			<label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:12px;">
				<input type="checkbox" name="show_avatars" value="1" checked={checked('show_avatars')} />
				Show Avatars
			</label>
			<div class="sp-field">
				<label class="sp-label">Default Avatar</label>
				{#each [{ value: 'mystery', label: 'Mystery Person' }, { value: 'blank', label: 'Blank' }, { value: 'gravatar_default', label: 'Gravatar Logo' }, { value: 'identicon', label: 'Identicon' }, { value: 'wavatar', label: 'Wavatar' }] as av}
					<label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:6px;">
						<input type="radio" name="avatar_default" value={av.value} checked={o['avatar_default'] === av.value || (!o['avatar_default'] && av.value === 'mystery')} />
						{av.label}
					</label>
				{/each}
			</div>
		</div>
	</div>

	<p style="margin-top:20px;">
		<button type="submit" class="sp-btn sp-btn-primary" disabled={submitting}>
			{submitting ? 'Saving…' : 'Save Changes'}
		</button>
	</p>
</form>
