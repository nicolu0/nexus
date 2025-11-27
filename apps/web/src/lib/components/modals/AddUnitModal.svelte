<script lang="ts">
	type UnitForm = {
		unitNumber: string;
	};

	const {
		unitPropertyLabel = '',
		unitForm,
		unitError = '',
		unitSubmitting = false,
		inputClasses = '',
		onClose = () => {},
		onSubmit = () => {}
	} = $props<{
		unitPropertyLabel?: string;
		unitForm: UnitForm;
		unitError?: string;
		unitSubmitting?: boolean;
		inputClasses?: string;
		onClose?: () => void;
		onSubmit?: (event: SubmitEvent) => void;
	}>();
</script>

<div class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-10" on:click={onClose}>
	<div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" on:click|stopPropagation>
		<h2 class="text-xl font-semibold text-stone-900">Add Unit</h2>
		<p class="mt-1 text-sm text-stone-500">
			Add a unit to <span class="font-semibold text-stone-800">{unitPropertyLabel}</span>.
		</p>

		{#if unitError}
			<p class="mt-4 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-900">{unitError}</p>
		{/if}

		<form class="mt-4 flex flex-col gap-4" on:submit={onSubmit}>
			<label class="flex flex-col gap-1 text-xs font-medium text-stone-500">
				<span>Unit number *</span>
				<input
					type="text"
					class={inputClasses}
					placeholder="Unit 5"
					bind:value={unitForm.unitNumber}
					required
				/>
			</label>

			<div class="flex justify-end gap-2 pt-2">
				<button
					type="button"
					class="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
					on:click={onClose}
					disabled={unitSubmitting}
				>
					Cancel
				</button>
				<button
					type="submit"
					class="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
					disabled={unitSubmitting}
				>
					{unitSubmitting ? 'Saving…' : 'Save unit'}
				</button>
			</div>
		</form>
	</div>
</div>
