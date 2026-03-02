<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import type { Node } from '@tiptap/pm/model';
	import BlockControls from './BlockControls.svelte';
	import type { FormField, FormSettings, FormFieldType } from '$lib/types/index.js';
	import { nanoid } from 'nanoid';

	let {
		node,
		editor,
		getPos
	}: {
		node: Node;
		editor: Editor;
		getPos: () => number | undefined;
	} = $props();

	// Derived from node attrs
	let nodeId = $derived((node.attrs.nodeId as string) ?? '');
	let title = $derived((node.attrs.title as string) ?? 'Contact Form');
	let fields = $derived((node.attrs.fields as FormField[]) ?? []);
	let settings = $derived(
		(node.attrs.settings as FormSettings) ?? {
			submitLabel: 'Send',
			successMessage: 'Thank you for your submission!',
			emailNotification: false
		}
	);

	// Local state synced from attrs (avoids input fighting with ProseMirror)
	let titleInput = $state(title);
	let fieldsLocal = $state<FormField[]>(fields);
	let settingsLocal = $state<FormSettings>({ ...settings });

	$effect(() => {
		titleInput = title;
	});
	$effect(() => {
		fieldsLocal = [...fields];
	});
	$effect(() => {
		settingsLocal = { ...settings };
	});

	let activeTab = $state<'fields' | 'settings' | 'preview'>('fields');
	let selectedFieldId = $state<string | null>(null);
	let dragOverIndex = $state<number | null>(null);
	let dragFromIndex = $state<number | null>(null);

	const fieldTypeOptions: { value: FormFieldType; label: string }[] = [
		{ value: 'text', label: 'Text' },
		{ value: 'email', label: 'Email' },
		{ value: 'textarea', label: 'Textarea' },
		{ value: 'select', label: 'Dropdown (Select)' },
		{ value: 'checkbox', label: 'Checkbox' },
		{ value: 'radio', label: 'Radio Buttons' },
		{ value: 'number', label: 'Number' },
		{ value: 'phone', label: 'Phone' },
		{ value: 'url', label: 'URL' },
		{ value: 'date', label: 'Date' },
		{ value: 'hidden', label: 'Hidden' }
	];

	let selectedField = $derived(fieldsLocal.find((f) => f.id === selectedFieldId) ?? null);

	function updateAttrs() {
		const pos = getPos();
		if (pos === undefined) return;
		editor.view.dispatch(
			editor.state.tr.setNodeMarkup(pos, undefined, {
				...node.attrs,
				title: titleInput,
				fields: fieldsLocal,
				settings: settingsLocal
			})
		);
	}

	function addField(type: FormFieldType = 'text') {
		const newField: FormField = {
			id: nanoid(8),
			type,
			label: fieldTypeOptions.find((o) => o.value === type)?.label ?? 'New Field',
			required: false
		};
		fieldsLocal = [...fieldsLocal, newField];
		selectedFieldId = newField.id;
		updateAttrs();
	}

	function removeField(id: string) {
		fieldsLocal = fieldsLocal.filter((f) => f.id !== id);
		if (selectedFieldId === id) selectedFieldId = null;
		updateAttrs();
	}

	function updateField(id: string, patch: Partial<FormField>) {
		fieldsLocal = fieldsLocal.map((f) => (f.id === id ? { ...f, ...patch } : f));
		updateAttrs();
	}

	function updateSettings(patch: Partial<FormSettings>) {
		settingsLocal = { ...settingsLocal, ...patch };
		updateAttrs();
	}

	// Drag-and-drop reorder
	function onDragStart(index: number, e: DragEvent) {
		dragFromIndex = index;
		e.dataTransfer!.effectAllowed = 'move';
	}

	function onDragOver(index: number, e: DragEvent) {
		e.preventDefault();
		dragOverIndex = index;
	}

	function onDrop(index: number, e: DragEvent) {
		e.preventDefault();
		if (dragFromIndex === null || dragFromIndex === index) return;
		const arr = [...fieldsLocal];
		const [moved] = arr.splice(dragFromIndex, 1);
		arr.splice(index, 0, moved);
		fieldsLocal = arr;
		dragFromIndex = null;
		dragOverIndex = null;
		updateAttrs();
	}

	function onDragEnd() {
		dragFromIndex = null;
		dragOverIndex = null;
	}

	// Options for select/radio fields (newline-separated string in UI)
	function getOptionsString(field: FormField): string {
		return (field.options ?? []).join('\n');
	}

	function setOptionsFromString(id: string, val: string) {
		const opts = val
			.split('\n')
			.map((s) => s.trim())
			.filter(Boolean);
		updateField(id, { options: opts });
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="sp-form-nv" contenteditable="false">
	<div class="sp-form-nv-header">
		<input
			type="text"
			class="sp-form-nv-title"
			placeholder="Form title…"
			bind:value={titleInput}
			onblur={updateAttrs}
		/>
		<div class="sp-form-nv-tabs">
			<button
				type="button"
				class="sp-form-nv-tab"
				class:active={activeTab === 'fields'}
				onclick={() => (activeTab = 'fields')}
			>Fields</button>
			<button
				type="button"
				class="sp-form-nv-tab"
				class:active={activeTab === 'settings'}
				onclick={() => (activeTab = 'settings')}
			>Settings</button>
			<button
				type="button"
				class="sp-form-nv-tab"
				class:active={activeTab === 'preview'}
				onclick={() => (activeTab = 'preview')}
			>Preview</button>
		</div>
	</div>

	{#if activeTab === 'fields'}
		<div class="sp-form-nv-body">
			<div class="sp-form-field-list" role="list">
				{#each fieldsLocal as field, i}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="sp-form-field-row"
						class:selected={selectedFieldId === field.id}
						class:drag-over={dragOverIndex === i}
						draggable="true"
						ondragstart={(e) => onDragStart(i, e)}
						ondragover={(e) => onDragOver(i, e)}
						ondrop={(e) => onDrop(i, e)}
						ondragend={onDragEnd}
						role="listitem"
					>
						<span class="sp-form-drag-handle" title="Drag to reorder">⠿</span>
						<button
							type="button"
							class="sp-form-field-btn"
							onclick={() =>
								(selectedFieldId = selectedFieldId === field.id ? null : field.id)}
						>
							<span class="sp-form-field-type-badge">{field.type}</span>
							<span class="sp-form-field-label">{field.label || '(no label)'}</span>
							{#if field.required}<span class="sp-form-field-required">*</span>{/if}
						</button>
						<button
							type="button"
							class="sp-form-field-delete"
							onclick={() => removeField(field.id)}
							title="Remove field"
						>×</button>
					</div>
				{/each}

				{#if fieldsLocal.length === 0}
					<div class="sp-form-empty">No fields yet. Add a field below.</div>
				{/if}
			</div>

			{#if selectedField}
				<div class="sp-form-field-editor">
					<h4 class="sp-form-field-editor-title">Edit Field</h4>
					<div class="sp-field">
						<label class="sp-label">Label</label>
						<input
							type="text"
							class="sp-input"
							value={selectedField.label}
							oninput={(e) =>
								updateField(selectedField!.id, {
									label: (e.target as HTMLInputElement).value
								})}
						/>
					</div>
					<div class="sp-field">
						<label class="sp-label">Type</label>
						<select
							class="sp-select"
							value={selectedField.type}
							onchange={(e) =>
								updateField(selectedField!.id, {
									type: (e.target as HTMLSelectElement).value as FormFieldType
								})}
						>
							{#each fieldTypeOptions as opt}
								<option value={opt.value}>{opt.label}</option>
							{/each}
						</select>
					</div>
					{#if selectedField.type !== 'hidden' && selectedField.type !== 'checkbox'}
						<div class="sp-field">
							<label class="sp-label">Placeholder</label>
							<input
								type="text"
								class="sp-input"
								value={selectedField.placeholder ?? ''}
								oninput={(e) =>
									updateField(selectedField!.id, {
										placeholder: (e.target as HTMLInputElement).value
									})}
							/>
						</div>
					{/if}
					{#if selectedField.type !== 'hidden'}
						<div class="sp-field" style="display:flex;align-items:center;gap:8px">
							<input
								type="checkbox"
								id="req-{selectedField.id}"
								checked={selectedField.required}
								onchange={(e) =>
									updateField(selectedField!.id, {
										required: (e.target as HTMLInputElement).checked
									})}
							/>
							<label for="req-{selectedField.id}" class="sp-label" style="margin:0"
								>Required</label
							>
						</div>
					{/if}
					{#if selectedField.type === 'select' || selectedField.type === 'radio'}
						<div class="sp-field">
							<label class="sp-label">Options (one per line)</label>
							<textarea
								class="sp-textarea"
								rows="4"
								value={getOptionsString(selectedField)}
								oninput={(e) =>
									setOptionsFromString(
										selectedField!.id,
										(e.target as HTMLTextAreaElement).value
									)}
							></textarea>
						</div>
					{/if}
					{#if selectedField.type === 'hidden'}
						<div class="sp-field">
							<label class="sp-label">Default Value</label>
							<input
								type="text"
								class="sp-input"
								value={selectedField.defaultValue ?? ''}
								oninput={(e) =>
									updateField(selectedField!.id, {
										defaultValue: (e.target as HTMLInputElement).value
									})}
							/>
						</div>
					{/if}
					{#if selectedField.type === 'text' || selectedField.type === 'textarea'}
						<div class="sp-field">
							<label class="sp-label">Min Length</label>
							<input
								type="number"
								class="sp-input"
								value={selectedField.validation?.minLength ?? ''}
								oninput={(e) =>
									updateField(selectedField!.id, {
										validation: {
											...selectedField!.validation,
											minLength:
												Number((e.target as HTMLInputElement).value) ||
												undefined
										}
									})}
							/>
						</div>
						<div class="sp-field">
							<label class="sp-label">Max Length</label>
							<input
								type="number"
								class="sp-input"
								value={selectedField.validation?.maxLength ?? ''}
								oninput={(e) =>
									updateField(selectedField!.id, {
										validation: {
											...selectedField!.validation,
											maxLength:
												Number((e.target as HTMLInputElement).value) ||
												undefined
										}
									})}
							/>
						</div>
					{/if}
				</div>
			{/if}

			<div class="sp-form-add-field">
				<label class="sp-label">Add field:</label>
				<div class="sp-form-type-grid">
					{#each fieldTypeOptions.slice(0, 8) as opt}
						<button
							type="button"
							class="sp-form-type-btn"
							onclick={() => addField(opt.value)}>{opt.label}</button
						>
					{/each}
				</div>
			</div>
		</div>
	{:else if activeTab === 'settings'}
		<div class="sp-form-nv-body">
			<div class="sp-field">
				<label class="sp-label">Submit Button Label</label>
				<input
					type="text"
					class="sp-input"
					value={settingsLocal.submitLabel}
					oninput={(e) =>
						updateSettings({ submitLabel: (e.target as HTMLInputElement).value })}
				/>
			</div>
			<div class="sp-field">
				<label class="sp-label">Success Message</label>
				<textarea
					class="sp-textarea"
					rows="3"
					value={settingsLocal.successMessage}
					oninput={(e) =>
						updateSettings({ successMessage: (e.target as HTMLTextAreaElement).value })}
				></textarea>
			</div>
			<div class="sp-field" style="display:flex;align-items:center;gap:8px">
				<input
					type="checkbox"
					id="email-notify-{nodeId}"
					checked={settingsLocal.emailNotification}
					onchange={(e) =>
						updateSettings({ emailNotification: (e.target as HTMLInputElement).checked })}
				/>
				<label for="email-notify-{nodeId}" class="sp-label" style="margin:0"
					>Email notification on submission</label
				>
			</div>
			{#if settingsLocal.emailNotification}
				<div class="sp-field">
					<label class="sp-label"
						>Notification Email (leave blank for admin email)</label
					>
					<input
						type="email"
						class="sp-input"
						value={settingsLocal.notificationEmail ?? ''}
						oninput={(e) =>
							updateSettings({
								notificationEmail: (e.target as HTMLInputElement).value
							})}
					/>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Preview tab -->
		<div class="sp-form-nv-body sp-form-preview">
			{#if fieldsLocal.length === 0}
				<div class="sp-form-empty">Add fields to see a preview.</div>
			{:else}
				{#each fieldsLocal.filter((f) => f.type !== 'hidden') as field}
					<div class="sp-form-preview-field">
						<label class="fp-form-label">
							{field.label}{#if field.required}<span style="color:#d63638"> *</span>{/if}
						</label>
						{#if field.type === 'textarea'}
							<textarea
								class="fp-form-textarea"
								placeholder={field.placeholder}
								disabled
								rows="3"
							></textarea>
						{:else if field.type === 'select'}
							<select class="fp-form-input" disabled>
								<option value="">Select…</option>
								{#each field.options ?? [] as opt}<option>{opt}</option>{/each}
							</select>
						{:else if field.type === 'checkbox'}
							<label style="display:flex;align-items:center;gap:6px">
								<input type="checkbox" disabled />
								{field.label}
							</label>
						{:else if field.type === 'radio'}
							<div>
								{#each field.options ?? [] as opt}
									<label
										style="display:flex;align-items:center;gap:6px;margin-bottom:4px"
									>
										<input type="radio" disabled />
										{opt}
									</label>
								{/each}
							</div>
						{:else}
							<input
								type={field.type === 'phone' ? 'tel' : field.type}
								class="fp-form-input"
								placeholder={field.placeholder}
								disabled
							/>
						{/if}
					</div>
				{/each}
				<button type="button" class="fp-form-submit" disabled
					>{settingsLocal.submitLabel}</button
				>
			{/if}
		</div>
	{/if}
</div>
<BlockControls {editor} {getPos} {node} />

<style>
	.sp-form-nv {
		border: 2px solid var(--sp-primary, #2271b1);
		border-radius: 6px;
		background: #fff;
		font-size: 13px;
	}

	.sp-form-nv-header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		background: #f0f4f8;
		border-bottom: 1px solid var(--sp-border, #c3c4c7);
		border-radius: 4px 4px 0 0;
		flex-wrap: wrap;
	}

	.sp-form-nv-title {
		flex: 1;
		min-width: 140px;
		border: 1px solid var(--sp-border, #c3c4c7);
		border-radius: 3px;
		padding: 4px 8px;
		font-size: 13px;
		font-weight: 600;
		font-family: inherit;
	}

	.sp-form-nv-tabs {
		display: flex;
		gap: 4px;
	}

	.sp-form-nv-tab {
		padding: 4px 10px;
		border: 1px solid var(--sp-border, #c3c4c7);
		border-radius: 3px;
		background: #fff;
		font-size: 12px;
		cursor: pointer;
		font-family: inherit;
	}

	.sp-form-nv-tab.active {
		background: var(--sp-primary, #2271b1);
		color: #fff;
		border-color: var(--sp-primary, #2271b1);
	}

	.sp-form-nv-body {
		padding: 12px;
	}

	.sp-form-field-list {
		margin-bottom: 12px;
		border: 1px solid var(--sp-border, #c3c4c7);
		border-radius: 4px;
		min-height: 40px;
	}

	.sp-form-field-row {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 8px;
		border-bottom: 1px solid var(--sp-border, #c3c4c7);
		cursor: pointer;
		transition: background 0.1s;
	}

	.sp-form-field-row:last-child {
		border-bottom: none;
	}

	.sp-form-field-row:hover,
	.sp-form-field-row.selected {
		background: #f0f4f8;
	}

	.sp-form-field-row.drag-over {
		border-top: 2px solid var(--sp-primary, #2271b1);
	}

	.sp-form-drag-handle {
		color: #aaa;
		cursor: grab;
		font-size: 16px;
		flex-shrink: 0;
	}

	.sp-form-field-btn {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 6px;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		font-size: 12px;
	}

	.sp-form-field-type-badge {
		background: #e8f0fe;
		color: #1a56db;
		border-radius: 3px;
		padding: 1px 5px;
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
	}

	.sp-form-field-label {
		flex: 1;
		color: var(--sp-text, #1d2327);
	}

	.sp-form-field-required {
		color: #d63638;
		font-weight: bold;
	}

	.sp-form-field-delete {
		background: none;
		border: none;
		cursor: pointer;
		color: #aaa;
		font-size: 16px;
		line-height: 1;
		padding: 0 4px;
		flex-shrink: 0;
	}

	.sp-form-field-delete:hover {
		color: var(--sp-error, #d63638);
	}

	.sp-form-empty {
		padding: 16px;
		text-align: center;
		color: var(--sp-text-muted, #646970);
		font-size: 12px;
	}

	.sp-form-field-editor {
		background: #f8f9fa;
		border: 1px solid var(--sp-border, #c3c4c7);
		border-radius: 4px;
		padding: 12px;
		margin-bottom: 12px;
	}

	.sp-form-field-editor-title {
		font-size: 12px;
		font-weight: 600;
		margin-bottom: 8px;
		color: var(--sp-text, #1d2327);
	}

	.sp-form-add-field {
		border-top: 1px solid var(--sp-border, #c3c4c7);
		padding-top: 12px;
		margin-top: 4px;
	}

	.sp-form-type-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-top: 6px;
	}

	.sp-form-type-btn {
		padding: 4px 10px;
		border: 1px solid var(--sp-border, #c3c4c7);
		border-radius: 3px;
		background: #fff;
		font-size: 11px;
		cursor: pointer;
		font-family: inherit;
		transition:
			background 0.1s,
			border-color 0.1s;
	}

	.sp-form-type-btn:hover {
		background: var(--sp-content-bg, #f0f0f1);
		border-color: var(--sp-primary, #2271b1);
	}

	.sp-form-preview {
		background: #fafafa;
	}

	.sp-form-preview-field {
		margin-bottom: 14px;
	}

	/* Frontend-like form preview styles */
	.fp-form-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: #1d2327;
		margin-bottom: 0.375rem;
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
		background: #fff;
		box-sizing: border-box;
	}

	.fp-form-textarea {
		resize: vertical;
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
		cursor: not-allowed;
		opacity: 0.7;
	}

	/* sp-field/sp-label reuse app.css classes */
	.sp-field {
		margin-bottom: 10px;
	}
	.sp-label {
		display: block;
		font-size: 12px;
		font-weight: 500;
		margin-bottom: 4px;
	}
</style>
