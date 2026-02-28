<script lang="ts">
	import { enhance } from '$app/forms';

	import type { PageData, ActionData } from './$types.js';
	let { data, form }: { data: PageData; form?: ActionData } = $props();

	type WidgetEntry = {
		id?: number;
		area: string;
		widgetType: string;
		settings: Record<string, unknown> | null;
		order: number;
		expanded?: boolean;
	};

	let widgetsByArea = $state<Record<string, WidgetEntry[]>>(
		Object.fromEntries(
			data.widgetAreas.map((area) => [
				area.id,
				(data.widgetsByArea[area.id] ?? []).map((w) => ({ ...w, expanded: false }))
			])
		)
	);

	let addingToArea = $state<string | null>(null);
	let savingArea = $state<string | null>(null);
	let removingId = $state<number | null>(null);

	function toggleWidget(areaId: string, idx: number) {
		widgetsByArea[areaId][idx].expanded = !widgetsByArea[areaId][idx].expanded;
	}

	function removeWidget(areaId: string, idx: number) {
		widgetsByArea[areaId] = widgetsByArea[areaId].filter((_, i) => i !== idx);
	}

	function moveWidgetUp(areaId: string, idx: number) {
		if (idx === 0) return;
		const arr = [...widgetsByArea[areaId]];
		[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
		widgetsByArea[areaId] = arr.map((w, i) => ({ ...w, order: i }));
	}

	function moveWidgetDown(areaId: string, idx: number) {
		const arr = widgetsByArea[areaId];
		if (idx >= arr.length - 1) return;
		const next = [...arr];
		[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
		widgetsByArea[areaId] = next.map((w, i) => ({ ...w, order: i }));
	}

	function widgetLabel(type: string) {
		return data.availableWidgets.find((w) => w.type === type)?.name ?? type;
	}
</script>

<svelte:head>
	<title>Widgets — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Widgets</h1>
</div>

{#if form?.success}
	<div class="sp-notice sp-notice-success">Widgets saved.</div>
{/if}
{#if form?.error}
	<div class="sp-notice sp-notice-error">{form.error}</div>
{/if}

<div style="display:grid; grid-template-columns:280px 1fr; gap:24px; align-items:start;">
	<!-- Available Widgets -->
	<div class="sp-card">
		<div class="sp-card-header"><h2 class="sp-card-title">Available Widgets</h2></div>
		<div class="sp-card-body" style="padding:0;">
			{#each data.availableWidgets as widget}
				<div style="padding:10px 16px;border-bottom:1px solid var(--sp-border);">
					<div style="font-size:13px;font-weight:600;margin-bottom:2px;">{widget.name}</div>
					<div style="font-size:12px;color:var(--sp-text-muted);margin-bottom:8px;">{widget.description}</div>
					<div style="display:flex;gap:6px;flex-wrap:wrap;">
						{#each data.widgetAreas as area}
							<form method="POST" action="?/addWidget" use:enhance={() => { return async ({ update }) => { await update(); }; }}>
								<input type="hidden" name="area" value={area.id} />
								<input type="hidden" name="widgetType" value={widget.type} />
								<button type="submit" class="sp-btn sp-btn-secondary sp-btn-sm" style="font-size:11px;">
									+ {area.name}
								</button>
							</form>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Widget Areas -->
	<div style="display:flex;flex-direction:column;gap:20px;">
		{#each data.widgetAreas as area}
			<div class="sp-card">
				<div class="sp-card-header">
					<h2 class="sp-card-title">{area.name}</h2>
				</div>
				<div class="sp-card-body">
					{#if widgetsByArea[area.id]?.length === 0}
						<p style="color:var(--sp-text-muted);font-size:13px;border:2px dashed var(--sp-border);padding:16px;text-align:center;border-radius:4px;">
							No widgets in this area. Add widgets from the left.
						</p>
					{:else}
						<div style="margin-bottom:12px;">
							{#each widgetsByArea[area.id] as widget, idx}
								<div style="border:1px solid var(--sp-border);border-radius:4px;margin-bottom:6px;overflow:hidden;">
									<!-- Widget header -->
									<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f6f7f7;cursor:pointer;" onclick={() => toggleWidget(area.id, idx)}>
										<span style="flex:1;font-size:13px;font-weight:600;">{widgetLabel(widget.widgetType)}</span>
										{#if widget.settings?.title}
											<span style="font-size:12px;color:var(--sp-text-muted);">: {widget.settings.title}</span>
										{/if}
										<div style="display:flex;gap:4px;">
											<button type="button" class="sp-btn sp-btn-sm sp-btn-secondary" onclick={(e) => { e.stopPropagation(); moveWidgetUp(area.id, idx); }} disabled={idx === 0}>↑</button>
											<button type="button" class="sp-btn sp-btn-sm sp-btn-secondary" onclick={(e) => { e.stopPropagation(); moveWidgetDown(area.id, idx); }} disabled={idx === widgetsByArea[area.id].length - 1}>↓</button>
										</div>
										<button type="button" class="sp-btn sp-btn-sm sp-btn-danger" onclick={(e) => { e.stopPropagation(); removeWidget(area.id, idx); }}>×</button>
									</div>
									<!-- Widget settings (expanded) -->
									{#if widget.expanded}
										<div style="padding:12px;border-top:1px solid var(--sp-border);">
											<div class="sp-field">
												<label class="sp-label">Title</label>
												<input
													type="text"
													class="sp-input"
													value={String(widget.settings?.title ?? '')}
													onchange={(e) => { widget.settings = { ...widget.settings, title: (e.target as HTMLInputElement).value }; }}
												/>
											</div>
											{#if widget.widgetType === 'text' || widget.widgetType === 'custom-html'}
												<div class="sp-field">
													<label class="sp-label">Content</label>
													<textarea
														class="sp-textarea"
														style="min-height:100px;"
														value={String(widget.settings?.content ?? '')}
														onchange={(e) => { widget.settings = { ...widget.settings, content: (e.target as HTMLTextAreaElement).value }; }}
													></textarea>
												</div>
											{/if}
											{#if widget.widgetType === 'recent-posts'}
												<div class="sp-field">
													<label class="sp-label">Number of posts to show</label>
													<input
														type="number"
														class="sp-input"
														style="width:80px;"
														value={Number(widget.settings?.count ?? 5)}
														onchange={(e) => { widget.settings = { ...widget.settings, count: Number((e.target as HTMLInputElement).value) }; }}
														min="1" max="20"
													/>
												</div>
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}

					<!-- Save button -->
					<form method="POST" action="?/save" use:enhance={() => { savingArea = area.id; return async ({ update }) => { await update(); savingArea = null; }; }}>
						<input type="hidden" name="area" value={area.id} />
						<input type="hidden" name="widgets" value={JSON.stringify(widgetsByArea[area.id].map((w, i) => ({ ...w, order: i })))} />
						<button type="submit" class="sp-btn sp-btn-primary sp-btn-sm" disabled={savingArea === area.id}>
							{savingArea === area.id ? 'Saving…' : 'Save ' + area.name}
						</button>
					</form>
				</div>
			</div>
		{/each}
	</div>
</div>
