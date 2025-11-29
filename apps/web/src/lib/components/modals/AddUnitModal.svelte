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

<div
	class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-10"
	on:click={onClose}
>
	<div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl" on:click|stopPropagation>
		<h2 class="flex flex-row items-center gap-2 text-xl font-semibold text-stone-900">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="currentColor"
				class="bi bi-house-door-fill h-5 w-5"
				viewBox="0 0 16 16"
			>
				<path
					d="M6.5 14.5v-3.505c0-.245.25-.495.5-.495h2c.25 0 .5.25.5.5v3.5a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5"
				/>
			</svg>
			Add Unit
		</h2>
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
