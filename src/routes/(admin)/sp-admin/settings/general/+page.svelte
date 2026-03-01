<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form }: {
		data: { opts: Record<string, string> };
		form?: { success?: boolean } | null;
	} = $props();

	const o = data.opts;
	const roles = [
		{ value: 'subscriber', label: 'Subscriber' },
		{ value: 'contributor', label: 'Contributor' },
		{ value: 'author', label: 'Author' },
		{ value: 'editor', label: 'Editor' },
		{ value: 'admin', label: 'Administrator' }
	];

	const timezones = [
		'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
		'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu',
		'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
		'Asia/Dubai', 'Asia/Kolkata', 'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul',
		'Australia/Sydney', 'Pacific/Auckland'
	];

	const dateFormats = [
		{ value: 'MMMM d, yyyy', label: 'January 1, 2025' },
		{ value: 'MMM d, yyyy', label: 'Jan 1, 2025' },
		{ value: 'MM/dd/yyyy', label: '01/01/2025' },
		{ value: 'dd/MM/yyyy', label: '01/01/2025 (d/m/y)' },
		{ value: 'yyyy-MM-dd', label: '2025-01-01' }
	];

	const timeFormats = [
		{ value: 'h:mm a', label: '1:00 pm' },
		{ value: 'HH:mm', label: '13:00' }
	];

	const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	let dateFormat = $state(o['date_format'] ?? 'MMMM d, yyyy');
	let timeFormat = $state(o['time_format'] ?? 'h:mm a');
	let customDate = $state('');
	let customTime = $state('');
	let useCustomDate = $state(!dateFormats.find((f) => f.value === dateFormat));
	let useCustomTime = $state(!timeFormats.find((f) => f.value === timeFormat));

	let submitting = $state(false);
</script>

<svelte:head>
	<title>General Settings — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">General Settings</h1>
</div>

{#if form?.success}
	<div class="sp-notice sp-notice-success">Settings saved.</div>
{/if}

<form method="POST" action="?/save" use:enhance={() => { submitting = true; return async ({ update }) => { await update({ reset: false }); submitting = false; }; }}>
	<table class="sp-settings-table">
		<tbody>
			<tr>
				<th><label class="sp-label" for="blogname">Site Title</label></th>
				<td><input type="text" id="blogname" name="blogname" class="sp-input" value={o['blogname'] ?? ''} /></td>
			</tr>
			<tr>
				<th><label class="sp-label" for="blogdescription">Tagline</label></th>
				<td>
					<input type="text" id="blogdescription" name="blogdescription" class="sp-input" value={o['blogdescription'] ?? ''} />
					<p class="sp-field-desc">In a few words, explain what this site is about.</p>
				</td>
			</tr>
			<tr>
				<th><label class="sp-label" for="siteurl">Site Address (URL)</label></th>
				<td><input type="url" id="siteurl" name="siteurl" class="sp-input" value={o['siteurl'] ?? ''} /></td>
			</tr>
			<tr>
				<th><label class="sp-label" for="admin_email">Administration Email Address</label></th>
				<td>
					<input type="email" id="admin_email" name="admin_email" class="sp-input" value={o['admin_email'] ?? ''} />
					<p class="sp-field-desc">This address is used for admin purposes.</p>
				</td>
			</tr>
			<tr>
				<th>Membership</th>
				<td>
					<label style="display:flex;align-items:center;gap:8px;font-size:13px;">
						<input type="checkbox" name="users_can_register" value="1" checked={o['users_can_register'] === '1'} />
						Anyone can register
					</label>
				</td>
			</tr>
			<tr>
				<th><label class="sp-label" for="default_role">New User Default Role</label></th>
				<td>
					<select id="default_role" name="default_role" class="sp-select">
						{#each roles as r}
							<option value={r.value} selected={o['default_role'] === r.value || (!o['default_role'] && r.value === 'subscriber')}>{r.label}</option>
						{/each}
					</select>
				</td>
			</tr>
			<tr>
				<th><label class="sp-label" for="timezone_string">Timezone</label></th>
				<td>
					<select id="timezone_string" name="timezone_string" class="sp-select">
						{#each timezones as tz}
							<option value={tz} selected={o['timezone_string'] === tz}>{tz}</option>
						{/each}
					</select>
					<p class="sp-field-desc">Choose a city in the same timezone as you.</p>
				</td>
			</tr>
			<tr>
				<th>Date Format</th>
				<td>
					{#each dateFormats as fmt}
						<label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:6px;">
							<input
								type="radio"
								name="date_format"
								value={fmt.value}
								checked={dateFormat === fmt.value && !useCustomDate}
								onchange={() => { dateFormat = fmt.value; useCustomDate = false; }}
							/>
							<span style="font-family:monospace;width:120px;">{fmt.value}</span>
							<span style="color:var(--sp-text-muted);">{fmt.label}</span>
						</label>
					{/each}
					<label style="display:flex;align-items:center;gap:8px;font-size:13px;">
						<input type="radio" name="date_format" value={customDate || dateFormat} checked={useCustomDate} onchange={() => (useCustomDate = true)} />
						Custom:
						<input type="text" class="sp-input" style="width:160px;" placeholder="Custom format" bind:value={customDate} onfocus={() => (useCustomDate = true)} />
					</label>
				</td>
			</tr>
			<tr>
				<th>Time Format</th>
				<td>
					{#each timeFormats as fmt}
						<label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:6px;">
							<input
								type="radio"
								name="time_format"
								value={fmt.value}
								checked={timeFormat === fmt.value && !useCustomTime}
								onchange={() => { timeFormat = fmt.value; useCustomTime = false; }}
							/>
							<span style="font-family:monospace;width:120px;">{fmt.value}</span>
							<span style="color:var(--sp-text-muted);">{fmt.label}</span>
						</label>
					{/each}
					<label style="display:flex;align-items:center;gap:8px;font-size:13px;">
						<input type="radio" name="time_format" value={customTime || timeFormat} checked={useCustomTime} onchange={() => (useCustomTime = true)} />
						Custom:
						<input type="text" class="sp-input" style="width:160px;" placeholder="Custom format" bind:value={customTime} onfocus={() => (useCustomTime = true)} />
					</label>
				</td>
			</tr>
			<tr>
				<th><label class="sp-label" for="start_of_week">Week Starts On</label></th>
				<td>
					<select id="start_of_week" name="start_of_week" class="sp-select">
						{#each weekDays as day, i}
							<option value={i} selected={Number(o['start_of_week'] ?? 0) === i}>{day}</option>
						{/each}
					</select>
				</td>
			</tr>
		</tbody>
	</table>

	<p class="sp-submit">
		<button type="submit" class="sp-btn sp-btn-primary" disabled={submitting}>
			{submitting ? 'Saving…' : 'Save Changes'}
		</button>
	</p>
</form>

<style>
	.sp-field-desc {
		font-size: 12px;
		color: var(--sp-text-muted);
		margin-top: 4px;
	}
	.sp-submit {
		margin-top: 20px;
	}
</style>
