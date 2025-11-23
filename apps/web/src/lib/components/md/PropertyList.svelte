<script lang="ts">
	import StatusDot from '$lib/components/sm/StatusDot.svelte';
	import UnitStatusPill from '$lib/components/sm/UnitStatusPill.svelte';
	import type { Property } from '$lib/types/dashboard';

	const noop = () => {};
	const noopSelect = (_property?: Property, _unit?: string) => {};

	const loadingProperties = Array.from({ length: 6 });
	const loadingUnits = Array.from({ length: 5 });

	let {
		properties = [],
		isLoading = false,
		onAddUnit = noop,
		onSelectUnit = noopSelect
	} = $props<{
		properties?: Property[];
		isLoading?: boolean;
		onAddUnit?: (property: Property) => void;
		onSelectUnit?: (property: Property, unit: string) => void;
	}>();
</script>

<div class="flex flex-col gap-4">
	{#if isLoading}
		{#each loadingProperties as _, idx (idx)}
			<div class="flex flex-col gap-1 opacity-80" aria-hidden="true">
				<div
					class="flex flex-col divide-y divide-stone-200 rounded-md border border-stone-200 bg-white"
				>
					<div class="flex items-center justify-between p-3">
						<span class="flex flex-row items-center gap-2 text-sm font-medium text-stone-600">
							<span class="h-2 w-2 rounded-full bg-stone-200"></span>
							<span class="loading-sheen h-4 w-36 rounded"></span>
						</span>
						<span class="loading-sheen h-6 w-16 rounded"></span>
					</div>

					{#each loadingUnits as __, unitIdx (unitIdx)}
						<div class="flex flex-row items-center justify-between p-3">
							<span class="loading-sheen h-4 w-24 rounded"></span>
							<div class="flex flex-row gap-4">
								<span class="loading-sheen h-5 w-16 rounded-full"></span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	{:else}
		{#each properties as property (property.id)}
			<div class="flex flex-col gap-1">
				<div
					class="flex flex-col divide-y divide-stone-200 rounded-md border border-stone-200 bg-white"
				>
					<div class="flex items-center justify-between p-3">
						<span class="flex flex-row items-center gap-2 text-sm font-medium text-stone-600">
							<StatusDot />
							{property.address}
						</span>

						<button
							type="button"
							class="rounded-md px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
							onclick={() => onAddUnit(property)}
						>
							+ Add unit
						</button>
					</div>

					{#each property.units as unit (unit)}
						<button
							class="flex flex-row items-center justify-between p-3 text-sm font-normal text-stone-600 transition hover:bg-stone-100"
							onclick={() => onSelectUnit(property, unit)}
						>
							{unit}
							<div class="flex flex-row gap-4">
								<UnitStatusPill label="Kitchen" />
							</div>
						</button>
					{/each}

					{#if property.units.length === 0}
						<div class="p-3 text-xs text-stone-400">No units yet.</div>
					{/if}
				</div>
			</div>
		{/each}
	{/if}
</div>

<style>
	.loading-sheen {
		position: relative;
		overflow: hidden;
		background-color: rgb(231 229 228);
	}

	.loading-sheen::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			120deg,
			transparent 0%,
			rgba(255, 255, 255, 0.8) 50%,
			transparent 100%
		);
		transform: translateX(-100%);
		animation: sheen 1s linear infinite;
	}

	@keyframes sheen {
		to {
			transform: translateX(100%);
		}
	}
</style>
