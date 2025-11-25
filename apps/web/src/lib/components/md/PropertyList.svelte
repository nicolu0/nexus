<script lang="ts">
	import StatusDot from '$lib/components/sm/StatusDot.svelte';
	import UnitStatusPill from '$lib/components/sm/UnitStatusPill.svelte';
	import type { Property, UnitSummary } from '$lib/types/dashboard';

	const noop = () => {};
	const noopSelect = (_property?: Property, _unit?: UnitSummary) => {};

	const loadingProperties = Array.from({ length: 6 });
	const loadingUnits = Array.from({ length: 5 });
	let collapsedPropertyIds = $state(new Set<string>());

	let {
		properties = [],
		isLoading = false,
		onAddUnit = noop,
		onSelectUnit = noopSelect
	} = $props<{
		properties?: Property[];
		isLoading?: boolean;
		onAddUnit?: (property: Property) => void;
		onSelectUnit?: (property: Property, unit: UnitSummary) => void;
	}>();

	function togglePropertyUnits(propertyId: string) {
		const next = new Set(collapsedPropertyIds);

		if (next.has(propertyId)) {
			next.delete(propertyId);
		} else {
			next.add(propertyId);
		}

		collapsedPropertyIds = next;
	}
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
			{@const isCollapsed = collapsedPropertyIds.has(property.id)}
			<div class="flex flex-col gap-1">
				<div
					class="flex flex-col divide-y divide-stone-200 rounded-md border border-stone-200 bg-white"
				>
					<div class="flex items-center justify-between p-3">
						<div class="flex flex-row items-center gap-2 text-sm font-medium text-stone-600">
							<StatusDot />
							{property.address}
						</div>

						<div class="flex flex-row items-center gap-1">
							<button
								type="button"
								class="rounded-md px-2 py-1 text-xs font-medium text-stone-500 hover:bg-stone-50"
								onclick={() => onAddUnit(property)}
							>
								+ Add unit
							</button>
							<button
								type="button"
								class="rounded-md p-1 text-stone-500 transition hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400"
								onclick={() => togglePropertyUnits(property.id)}
								aria-expanded={!isCollapsed}
								aria-label={`${isCollapsed ? 'Show' : 'Hide'} units for ${property.address}`}
							>
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="h-4 w-4 transition-transform"
									class:-rotate-90={isCollapsed}
									aria-hidden="true"
								>
									<path d="M6 9l6 6 6-6" />
								</svg>
							</button>
						</div>
					</div>

					{#if !isCollapsed}
						{#each property.units as unit (unit.id)}
							<button
								class="flex flex-row items-center justify-between p-3 text-sm font-normal text-stone-600 transition hover:bg-stone-100"
								onclick={() => onSelectUnit(property, unit)}
							>
								{unit.label}
								<div class="flex flex-row gap-4">
									<UnitStatusPill label="Kitchen" />
								</div>
							</button>
						{/each}

						{#if property.units.length === 0}
							<div class="p-3 text-xs text-stone-400">No units yet.</div>
						{/if}
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
