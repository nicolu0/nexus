<script lang="ts">
	import StatusDot from '$lib/components/sm/StatusDot.svelte';
	import type { PropertyStatusFilter } from '$lib/types/dashboard';

	const noop = () => {};
	const noopString = (_value: string) => {};
	const noopStatus = (_value: PropertyStatusFilter) => {};

	const statusOptions: { value: PropertyStatusFilter; label: string }[] = [
		{ value: 'all', label: 'All statuses' },
		{ value: 'withUnits', label: 'Has units' },
		{ value: 'withoutUnits', label: 'No units yet' }
	];

	let {
		propertyQuery = '',
		unitQuery = '',
		statusFilter = 'all',
		onPropertyQueryChange = noopString,
		onUnitQueryChange = noopString,
		onStatusChange = noopStatus,
		onAddProperty = noop
	} = $props<{
		propertyQuery?: string;
		unitQuery?: string;
		statusFilter?: PropertyStatusFilter;
		onPropertyQueryChange?: (value: string) => void;
		onUnitQueryChange?: (value: string) => void;
		onStatusChange?: (value: PropertyStatusFilter) => void;
		onAddProperty?: () => void;
	}>();

	const handlePropertyInput = (event: Event) => {
		const target = event.currentTarget as HTMLInputElement;
		onPropertyQueryChange(target.value);
	};

	const handleUnitInput = (event: Event) => {
		const target = event.currentTarget as HTMLInputElement;
		onUnitQueryChange(target.value);
	};

	const handleStatusChange = (event: Event) => {
		const target = event.currentTarget as HTMLSelectElement;
		onStatusChange(target.value as PropertyStatusFilter);
	};
</script>

<div class="flex w-full flex-wrap items-center justify-between gap-3">
	<div class="flex flex-row flex-wrap gap-2">
		<label
			class="flex items-center rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-500 focus-within:border-stone-300 focus-within:ring-1 focus-within:ring-stone-300"
		>
			<span class="flex items-center text-stone-400">
				<svg
					viewBox="0 0 16 16"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					aria-hidden="true"
					class="h-3 w-3"
				>
					<path
						d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.018-.009Zm-5.242.656a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z"
						fill="currentColor"
					/>
				</svg>
			</span>
			<input
				class="w-40 appearance-none border-0 bg-transparent pl-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none"
				placeholder="All properties..."
				value={propertyQuery}
				oninput={handlePropertyInput}
			/>
		</label>

		<label
			class="flex items-center rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-500 focus-within:border-stone-300 focus-within:ring-1 focus-within:ring-stone-300"
		>
			<span class="flex items-center text-stone-400">
				<svg
					viewBox="0 0 16 16"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					aria-hidden="true"
					class="h-3 w-3"
				>
					<path
						d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.018-.009Zm-5.242.656a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z"
						fill="currentColor"
					/>
				</svg>
			</span>
			<input
				class="w-40 appearance-none border-0 bg-transparent pl-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none"
				placeholder="All units..."
				value={unitQuery}
				oninput={handleUnitInput}
			/>
		</label>
	</div>

	<button
		type="button"
		class="rounded-md border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
		onclick={onAddProperty}
	>
		+ Add property
	</button>
</div>
