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

<div class="flex w-full items-center justify-between">
	<div class="flex flex-row gap-2">
		<input
			class="w-70 appearance-none rounded-md border border-stone-200 bg-white p-2 text-xs text-stone-900 ring-0
					outline-none placeholder:text-stone-400
					focus:border-stone-300 focus:ring-1 focus:ring-stone-300 focus:ring-offset-0
					focus-visible:ring-1 focus-visible:ring-stone-300 focus-visible:outline-none"
			placeholder="All Properties..."
			value={propertyQuery}
			oninput={handlePropertyInput}
		/>

		<input
			class="w-70 appearance-none rounded-md border border-stone-200 bg-white p-2 text-xs text-stone-900 ring-0
					outline-none placeholder:text-stone-400
					focus:border-stone-300 focus:ring-1 focus:ring-stone-300 focus:ring-offset-0
					focus-visible:ring-1 focus-visible:ring-stone-300 focus-visible:outline-none"
			placeholder="All Units..."
			value={unitQuery}
			oninput={handleUnitInput}
		/>
	</div>

	<button
		type="button"
		class="rounded-md border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
		onclick={onAddProperty}
	>
		+ Add property
	</button>
</div>
