<script lang="ts">
	import { enhance } from '$app/forms';
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { invalidateAll } from '$app/navigation';

	import type { PageData, ActionData } from './$types.js';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	type WidgetEntry = {
		id: number;
		area: string;
		widgetType: string;
		settings: Record<string, unknown> | null;
		order: number;
		// UI-only state
		expanded: boolean;
		// local edits before saving settings
		localTitle: string;
		localContent: string;
		localCount: number;
	};

	function toEntry(w: (typeof data.widgetsByArea)[string][number]): WidgetEntry {
		const s = (w.settings ?? {}) as Record<string, unknown>;
		return {
			...w,
			expanded: false,
			localTitle: String(s.title ?? ''),
			localContent: String(s.content ?? ''),
			localCount: Number(s.count ?? 5)
		};
	}

	// Per-area reactive arrays — kept in sync with server data via $effect below.
	// Initialised with an empty record; $effect fills it on first run.
	let widgetsByArea = $state<Record<string, WidgetEntry[]>>({});

	// Sync from server after any invalidation, preserving UI state for existing widgets
	$effect(() => {
		for (const area of data.widgetAreas) {
			const prevById = new Map(
				(widgetsByArea[area.id] ?? []).map((w) => [w.id, w])
			);
			widgetsByArea[area.id] = (data.widgetsByArea[area.id] ?? []).map((w) => {
				const prev = prevById.get(w.id);
				if (prev) {
					// keep expanded/edit state, refresh order from server
					return { ...prev, order: w.order };
				}
				return toEntry(w);
			});
		}
	});

	// Track which widget's settings are being saved
	let savingWidgetId = $state<number | null>(null);
	// Track which area is being drag-reordered
	let reorderingArea = $state<string | null>(null);

	function widgetLabel(type: string) {
		return data.availableWidgets.find((w) => w.type === type)?.name ?? type;
	}

	function toggleExpand(areaId: string, idx: number) {
		widgetsByArea[areaId][idx].expanded = !widgetsByArea[areaId][idx].expanded;
	}

	// ── DnD handlers ────────────────────────────────────────────────────────────

	function handleDndConsider(areaId: string, e: CustomEvent<DndEvent<WidgetEntry>>) {
		widgetsByArea[areaId] = e.detail.items;
	}

	async function handleDndFinalize(areaId: string, e: CustomEvent<DndEvent<WidgetEntry>>) {
		widgetsByArea[areaId] = e.detail.items;
		await persistReorder(areaId);
	}

	// ── Reorder via up/down buttons ──────────────────────────────────────────────

	async function moveUp(areaId: string, idx: number) {
		if (idx === 0) return;
		const arr = [...widgetsByArea[areaId]];
		[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
		widgetsByArea[areaId] = arr;
		await persistReorder(areaId);
	}

	async function moveDown(areaId: string, idx: number) {
		const arr = widgetsByArea[areaId];
		if (idx >= arr.length - 1) return;
		const next = [...arr];
		[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
		widgetsByArea[areaId] = next;
		await persistReorder(areaId);
	}

	async function persistReorder(areaId: string) {
		reorderingArea = areaId;
		const fd = new FormData();
		for (const w of widgetsByArea[areaId]) {
			fd.append('ids', String(w.id));
		}
		try {
			await fetch('?/reorderWidgets', { method: 'POST', body: fd });
			await invalidateAll();
		} finally {
			reorderingArea = null;
		}
	}

	// ── Save widget settings ─────────────────────────────────────────────────────

	async function saveWidgetSettings(areaId: string, idx: number) {
		const w = widgetsByArea[areaId][idx];
		savingWidgetId = w.id;
		const settings: Record<string, unknown> = { title: w.localTitle };
		if (w.widgetType === 'text' || w.widgetType === 'custom-html') {
			settings.content = w.localContent;
		}
		if (w.widgetType === 'recent-posts') {
			settings.count = w.localCount;
		}
		const fd = new FormData();
		fd.append('widgetId', String(w.id));
		fd.append('settings', JSON.stringify(settings));
		try {
			await fetch('?/saveWidget', { method: 'POST', body: fd });
			await invalidateAll();
		} finally {
			savingWidgetId = null;
		}
	}
</script>

<svelte:head>
	<title>Widgets — SveltePress</title>
</svelte:head>

<div class="sp-page-header">
	<h1 class="sp-page-title">Widgets</h1>
</div>

{#if form?.success}
	<div class="sp-notice sp-notice-success">Changes saved.</div>
{/if}
{#if form?.error}
	<div class="sp-notice sp-notice-error">{form.error}</div>
{/if}

<div style="display:grid; grid-template-columns:280px 1fr; gap:24px; align-items:start;">
	<!-- ── Available Widgets ── -->
	<div class="sp-card">
		<div class="sp-card-header"><h2 class="sp-card-title">Available Widgets</h2></div>
		<div class="sp-card-body" style="padding:0;">
			{#each data.availableWidgets as widget}
				<div style="padding:10px 16px;border-bottom:1px solid var(--sp-border);">
					<div style="font-size:13px;font-weight:600;margin-bottom:2px;">{widget.name}</div>
					<div style="font-size:12px;color:var(--sp-text-muted);margin-bottom:8px;">
						{widget.description}
					</div>
					<div style="display:flex;gap:6px;flex-wrap:wrap;">
						{#each data.widgetAreas as area}
							<form
								method="POST"
								action="?/addWidget"
								use:enhance={() => {
									return async ({ update }) => {
										await update({ invalidateAll: true });
									};
								}}
							>
								<input type="hidden" name="area" value={area.id} />
								<input type="hidden" name="widgetType" value={widget.type} />
								<button
									type="submit"
									class="sp-btn sp-btn-secondary sp-btn-sm"
									style="font-size:11px;"
								>
									+ {area.name}
								</button>
							</form>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- ── Widget Areas ── -->
	<div style="display:flex;flex-direction:column;gap:20px;">
		{#each data.widgetAreas as area}
			<div class="sp-card">
				<div class="sp-card-header">
					<h2 class="sp-card-title">{area.name}</h2>
					{#if reorderingArea === area.id}
						<span style="font-size:12px;color:var(--sp-text-muted);">Saving order…</span>
					{/if}
				</div>
				<div class="sp-card-body">
					{#if widgetsByArea[area.id]?.length === 0}
						<p
							style="color:var(--sp-text-muted);font-size:13px;border:2px dashed var(--sp-border);padding:16px;text-align:center;border-radius:4px;"
						>
							No widgets in this area. Add widgets from the left panel.
						</p>
					{:else}
						<!-- DnD drop zone -->
						<div
							use:dndzone={{ items: widgetsByArea[area.id], flipDurationMs: 150 }}
							onconsider={(e) => handleDndConsider(area.id, e)}
							onfinalize={(e) => handleDndFinalize(area.id, e)}
							style="margin-bottom:12px;min-height:40px;"
						>
							{#each widgetsByArea[area.id] as widget, idx (widget.id)}
								<div
									animate:flip={{ duration: 150 }}
									style="border:1px solid var(--sp-border);border-radius:4px;margin-bottom:6px;overflow:hidden;background:#fff;"
								>
									<!-- Widget header (drag handle + controls) -->
									<div
										style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f6f7f7;cursor:grab;"
										onclick={() => toggleExpand(area.id, idx)}
									>
										<span
											title="Drag to reorder"
											style="color:var(--sp-text-muted);cursor:grab;font-size:16px;line-height:1;flex-shrink:0;"
										>⠿</span>
										<span style="flex:1;font-size:13px;font-weight:600;">
											{widgetLabel(widget.widgetType)}
											{#if widget.localTitle}
												<span style="font-weight:400;color:var(--sp-text-muted);">: {widget.localTitle}</span>
											{/if}
										</span>
										<!-- Up/down buttons -->
										<div style="display:flex;gap:4px;" onclick={(e) => e.stopPropagation()}>
											<button
												type="button"
												class="sp-btn sp-btn-sm sp-btn-secondary"
												onclick={() => moveUp(area.id, idx)}
												disabled={idx === 0}
												title="Move up"
											>↑</button>
											<button
												type="button"
												class="sp-btn sp-btn-sm sp-btn-secondary"
												onclick={() => moveDown(area.id, idx)}
												disabled={idx === widgetsByArea[area.id].length - 1}
												title="Move down"
											>↓</button>
										</div>
										<!-- Remove button -->
										<form
											method="POST"
											action="?/removeWidget"
											style="display:contents;"
											onclick={(e) => e.stopPropagation()}
											use:enhance={() => {
												return async ({ update }) => {
													await update({ invalidateAll: true });
												};
											}}
										>
											<input type="hidden" name="widgetId" value={widget.id} />
											<button
												type="submit"
												class="sp-btn sp-btn-sm sp-btn-danger"
												title="Remove widget"
											>×</button>
										</form>
									</div>

									<!-- Expanded settings panel -->
									{#if widget.expanded}
										<div style="padding:12px;border-top:1px solid var(--sp-border);">
											<!-- Title field (all widget types) -->
											<div class="sp-field">
												<label class="sp-label">Title</label>
												<input
													type="text"
													class="sp-input"
													bind:value={widget.localTitle}
												/>
											</div>

											<!-- Text / Custom HTML content -->
											{#if widget.widgetType === 'text' || widget.widgetType === 'custom-html'}
												<div class="sp-field">
													<label class="sp-label">Content</label>
													<textarea
														class="sp-textarea"
														style="min-height:100px;"
														bind:value={widget.localContent}
													></textarea>
												</div>
											{/if}

											<!-- Recent Posts count -->
											{#if widget.widgetType === 'recent-posts'}
												<div class="sp-field">
													<label class="sp-label">Number of posts to show</label>
													<input
														type="number"
														class="sp-input"
														style="width:80px;"
														bind:value={widget.localCount}
														min="1"
														max="20"
													/>
												</div>
											{/if}

											<div style="display:flex;gap:8px;margin-top:4px;">
												<button
													type="button"
													class="sp-btn sp-btn-primary sp-btn-sm"
													disabled={savingWidgetId === widget.id}
													onclick={() => saveWidgetSettings(area.id, idx)}
												>
													{savingWidgetId === widget.id ? 'Saving…' : 'Save'}
												</button>
												<button
													type="button"
													class="sp-btn sp-btn-secondary sp-btn-sm"
													onclick={() => toggleExpand(area.id, idx)}
												>
													Close
												</button>
											</div>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>
