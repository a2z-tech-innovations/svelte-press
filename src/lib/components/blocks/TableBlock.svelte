<script lang="ts">
	import type { Block } from '$lib/types/index.js';

	let {
		block,
		onupdate
	}: {
		block: Block;
		onupdate: (block: Block) => void;
	} = $props();

	let rows = $derived((block.attrs.rows as string[][]) ?? [['', ''], ['', '']]);
	let hasHeader = $derived(Boolean(block.attrs.hasHeader ?? true));

	function updateCell(rowIdx: number, colIdx: number, value: string) {
		const next = rows.map((row) => [...row]);
		next[rowIdx][colIdx] = value;
		onupdate({ ...block, attrs: { ...block.attrs, rows: next } });
	}

	function addRow() {
		const colCount = rows[0]?.length ?? 2;
		const newRow = Array(colCount).fill('');
		onupdate({ ...block, attrs: { ...block.attrs, rows: [...rows, newRow] } });
	}

	function removeRow(rowIdx: number) {
		if (rows.length <= 1) return;
		const next = rows.filter((_, i) => i !== rowIdx);
		onupdate({ ...block, attrs: { ...block.attrs, rows: next } });
	}

	function addColumn() {
		const next = rows.map((row) => [...row, '']);
		onupdate({ ...block, attrs: { ...block.attrs, rows: next } });
	}

	function removeColumn(colIdx: number) {
		const colCount = rows[0]?.length ?? 0;
		if (colCount <= 1) return;
		const next = rows.map((row) => row.filter((_, i) => i !== colIdx));
		onupdate({ ...block, attrs: { ...block.attrs, rows: next } });
	}

	function toggleHeader() {
		onupdate({ ...block, attrs: { ...block.attrs, hasHeader: !hasHeader } });
	}
</script>

<div class="sp-table-block" onclick={(e) => e.stopPropagation()}>
	<div class="sp-table-toolbar">
		<button type="button" class="sp-btn sp-btn-secondary sp-btn-sm" onclick={addRow}>+ Row</button>
		<button type="button" class="sp-btn sp-btn-secondary sp-btn-sm" onclick={addColumn}>+ Column</button>
		<label class="sp-table-header-toggle">
			<input type="checkbox" checked={hasHeader} onchange={toggleHeader} />
			<span>Header row</span>
		</label>
	</div>

	<div class="sp-table-wrap-inner">
		<table class="sp-table-editor">
			{#if hasHeader && rows.length > 0}
				<thead>
					<tr>
						{#each rows[0] as cell, colIdx}
							<th class="sp-table-cell">
								<input
									type="text"
									class="sp-table-cell-input sp-table-header-cell"
									value={cell}
									oninput={(e) => updateCell(0, colIdx, (e.target as HTMLInputElement).value)}
									placeholder="Header"
								/>
							</th>
						{/each}
						<th class="sp-table-action-col">
							<button
								type="button"
								class="sp-table-col-del"
								title="Delete last column"
								onclick={() => removeColumn((rows[0]?.length ?? 1) - 1)}
								aria-label="Delete last column"
							>
								<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
									<path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
								</svg>
							</button>
						</th>
					</tr>
				</thead>
			{/if}
			<tbody>
				{#each rows as row, rowIdx}
					{#if rowIdx === 0 && hasHeader}{:else}
						<tr>
							{#each row as cell, colIdx}
								<td class="sp-table-cell">
									<input
										type="text"
										class="sp-table-cell-input"
										value={cell}
										oninput={(e) => updateCell(rowIdx, colIdx, (e.target as HTMLInputElement).value)}
										placeholder="Cell"
									/>
								</td>
							{/each}
							<td class="sp-table-action-col">
								<button
									type="button"
									class="sp-table-row-del"
									title="Delete row"
									onclick={() => removeRow(rowIdx)}
									aria-label="Delete row {rowIdx}"
								>
									<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
										<path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
									</svg>
								</button>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.sp-table-block {
		width: 100%;
	}

	.sp-table-toolbar {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 10px;
	}

	.sp-table-header-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--sp-text-muted);
		cursor: pointer;
		margin-left: 4px;
	}

	.sp-table-wrap-inner {
		overflow-x: auto;
	}

	.sp-table-editor {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
	}

	.sp-table-cell {
		border: 1px solid var(--sp-border);
		padding: 0;
		min-width: 80px;
	}

	.sp-table-cell-input {
		width: 100%;
		border: none;
		outline: none;
		padding: 6px 8px;
		font-size: 14px;
		background: transparent;
		color: var(--sp-text);
		box-sizing: border-box;
	}

	.sp-table-header-cell {
		font-weight: 600;
		background: #f0f0f1;
	}

	.sp-table-action-col {
		border: none;
		width: 24px;
		vertical-align: middle;
		padding: 0 2px;
	}

	.sp-table-row-del,
	.sp-table-col-del {
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: none;
		color: var(--sp-text-muted);
		cursor: pointer;
		border-radius: 3px;
		transition: background-color 0.1s, color 0.1s;
	}

	.sp-table-row-del:hover,
	.sp-table-col-del:hover {
		background: #fde7e7;
		color: var(--sp-error);
	}
</style>
