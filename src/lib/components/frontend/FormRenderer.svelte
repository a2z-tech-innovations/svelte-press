<script lang="ts">
	import { enhance } from '$app/forms';
	import type { FormConfig } from '$lib/types/index.js';

	let {
		config,
		submitted = false,
		nodeId
	}: {
		config: FormConfig;
		submitted?: boolean;
		nodeId: string;
	} = $props();

	let formErrors = $state<Record<string, string[]>>({});
	let serverError = $state('');

	// Clear errors when submitted
	$effect(() => {
		if (submitted) {
			formErrors = {};
			serverError = '';
		}
	});
</script>

{#if submitted}
	<div class="fp-form-success">
		{config.settings.successMessage || 'Thank you for your submission!'}
	</div>
{:else}
	{#if serverError}
		<div class="fp-notice fp-notice--error">{serverError}</div>
	{/if}
	<form method="POST" action="?/submitForm" use:enhance>
		<input type="hidden" name="_formNodeId" value={nodeId} />
		<!-- Honeypot (hidden from real users) -->
		<div style="display:none" aria-hidden="true">
			<input type="text" name="_honeypot" tabindex="-1" autocomplete="off" />
		</div>

		{#each config.fields.filter(f => f.type !== 'hidden') as field}
			<div class="fp-form-field">
				{#if field.type !== 'checkbox'}
					<label class="fp-form-label" for="field-{field.id}">
						{field.label}
						{#if field.required}<span aria-hidden="true"> *</span>{/if}
					</label>
				{/if}

				{#if field.type === 'textarea'}
					<textarea
						id="field-{field.id}"
						name={field.id}
						class="fp-form-textarea"
						placeholder={field.placeholder ?? ''}
						required={field.required}
						rows="4"
					></textarea>
				{:else if field.type === 'select'}
					<select id="field-{field.id}" name={field.id} class="fp-form-input" required={field.required}>
						<option value="">Select…</option>
						{#each field.options ?? [] as opt}<option value={opt}>{opt}</option>{/each}
					</select>
				{:else if field.type === 'radio'}
					<div class="fp-form-radio-group">
						{#each field.options ?? [] as opt}
							<label class="fp-form-radio-label">
								<input type="radio" name={field.id} value={opt} required={field.required} />
								{opt}
							</label>
						{/each}
					</div>
				{:else if field.type === 'checkbox'}
					<label class="fp-form-checkbox-label">
						<input type="checkbox" id="field-{field.id}" name={field.id} value="yes" />
						{field.label}
						{#if field.required}<span aria-hidden="true"> *</span>{/if}
					</label>
				{:else}
					<input
						id="field-{field.id}"
						type={field.type === 'phone' ? 'tel' : field.type}
						name={field.id}
						class="fp-form-input"
						placeholder={field.placeholder ?? ''}
						required={field.required}
					/>
				{/if}

				{#if formErrors[field.id]?.length}
					<p class="fp-form-error">{formErrors[field.id][0]}</p>
				{/if}
			</div>
		{/each}

		<!-- Hidden fields -->
		{#each config.fields.filter(f => f.type === 'hidden') as field}
			<input type="hidden" name={field.id} value={field.defaultValue ?? ''} />
		{/each}

		<button type="submit" class="fp-form-submit">{config.settings.submitLabel || 'Send'}</button>
	</form>
{/if}

<style>
	.fp-form-success {
		background: #edfaef;
		border: 1px solid #00a32a;
		color: #004a12;
		padding: 1rem;
		border-radius: 4px;
		margin-bottom: 1rem;
	}

	.fp-form-field {
		margin-bottom: 1rem;
	}

	.fp-form-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: #1d2327;
		margin-bottom: 0.375rem;
	}

	.fp-form-label span {
		color: #d63638;
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
		box-sizing: border-box;
	}

	.fp-form-input:focus,
	.fp-form-textarea:focus {
		outline: none;
		border-color: #2271b1;
	}

	.fp-form-textarea {
		resize: vertical;
		min-height: 120px;
	}

	.fp-form-radio-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.fp-form-radio-label,
	.fp-form-checkbox-label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.9375rem;
		cursor: pointer;
	}

	.fp-form-error {
		color: #d63638;
		font-size: 0.8125rem;
		margin-top: 4px;
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
		cursor: pointer;
		transition: background 0.15s;
	}

	.fp-form-submit:hover {
		background: #2271b1;
	}

	.fp-notice {
		padding: 0.875rem 1rem;
		border-radius: 4px;
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}

	.fp-notice--error {
		background: #fceaea;
		border: 1px solid #d63638;
		color: #6d0d0f;
	}
</style>
