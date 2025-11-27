<script lang="ts">
	type PropertyForm = {
		name: string;
		addressLine1: string;
		addressLine2: string;
		city: string;
		state: string;
		postalCode: string;
	};

	const {
		propertyForm,
		propertyError = '',
		propertySubmitting = false,
		inputClasses = '',
		onClose = () => {},
		onSubmit = () => {}
	} = $props<{
		propertyForm: PropertyForm;
		propertyError?: string;
		propertySubmitting?: boolean;
		inputClasses?: string;
		onClose?: () => void;
		onSubmit?: (event: SubmitEvent) => void;
	}>();
</script>

<div class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-10" on:click={onClose}>
	<div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" on:click|stopPropagation>
		<h2 class="text-xl font-semibold text-stone-900">Add Property</h2>
		<p class="mt-1 text-sm text-stone-500">Enter a name and address for the new property.</p>

		{#if propertyError}
			<p class="mt-4 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-900">{propertyError}</p>
		{/if}

		<form class="mt-4 flex flex-col gap-4" on:submit={onSubmit}>
			<label class="flex flex-col gap-1 text-xs font-medium text-stone-500">
				<span>Property name</span>
				<input
					type="text"
					class={inputClasses}
					placeholder="e.g. 502 E Healey St"
					bind:value={propertyForm.name}
				/>
			</label>

			<label class="flex flex-col gap-1 text-xs font-medium text-stone-500">
				<span>Address line 1</span>
				<input type="text" class={inputClasses} placeholder="Street address" bind:value={propertyForm.addressLine1} />
			</label>

			<label class="flex flex-col gap-1 text-xs font-medium text-stone-500">
				<span>Address line 2</span>
				<input
					type="text"
					class={inputClasses}
					placeholder="Apartment, suite, etc."
					bind:value={propertyForm.addressLine2}
				/>
			</label>

			<div class="grid gap-4 sm:grid-cols-3">
				<label class="flex flex-col gap-1 text-xs font-medium text-stone-500">
					<span>City</span>
					<input type="text" class={inputClasses} bind:value={propertyForm.city} />
				</label>
				<label class="flex flex-col gap-1 text-xs font-medium text-stone-500">
					<span>State</span>
					<input type="text" class={inputClasses} bind:value={propertyForm.state} />
				</label>
				<label class="flex flex-col gap-1 text-xs font-medium text-stone-500">
					<span>Postal code</span>
					<input type="text" class={inputClasses} bind:value={propertyForm.postalCode} />
				</label>
			</div>

			<div class="flex justify-end gap-2 pt-2">
				<button
					type="button"
					class="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
					on:click={onClose}
					disabled={propertySubmitting}
				>
					Cancel
				</button>
				<button
					type="submit"
					class="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
					disabled={propertySubmitting}
				>
					{propertySubmitting ? 'Saving…' : 'Save property'}
				</button>
			</div>
		</form>
	</div>
</div>
