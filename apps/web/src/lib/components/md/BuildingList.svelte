<script lang="ts">
	import StatusDot from '$lib/components/sm/StatusDot.svelte';
	import UnitStatusPill from '$lib/components/sm/UnitStatusPill.svelte';
	import type { Building } from '$lib/types/dashboard';

	const noop = () => {};
	const noopSelect = (_building?: Building, _unit?: string) => {};

	let {
		buildings = [],
		onAddUnit = noop,
		onSelectUnit = noopSelect
	} = $props<{
		buildings?: Building[];
		onAddUnit?: (buildingId: string) => void;
		onSelectUnit?: (building: Building, unit: string) => void;
	}>();
</script>

<div class="flex flex-col gap-4">
	{#each buildings as building (building.id)}
		<div class="flex flex-col gap-1">
			<div
				class="flex flex-col divide-y divide-stone-200 rounded-md border border-stone-200 bg-white"
			>
				<div class="flex items-center justify-between p-3">
					<span class="flex flex-row items-center gap-2 text-sm font-medium text-stone-600">
						<StatusDot />
						{building.address}
					</span>

					<button
						type="button"
						class="rounded-md px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
						onclick={() => onAddUnit(building.id)}
					>
						+ Add unit
					</button>
				</div>

				{#each building.units as unit (unit)}
					<button
						class="flex flex-row items-center justify-between p-3 text-sm font-normal text-stone-600 transition hover:bg-stone-100"
						onclick={() => onSelectUnit(building, unit)}
					>
						{unit}
						<div class="flex flex-row gap-4">
							<UnitStatusPill label="Kitchen" />
						</div>
					</button>
				{/each}

				{#if building.units.length === 0}
					<div class="p-3 text-xs text-stone-400">No units yet.</div>
				{/if}
			</div>
		</div>
	{/each}
</div>
