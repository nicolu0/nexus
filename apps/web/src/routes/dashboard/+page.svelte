<script lang="ts">
	import BuildingList from '$lib/components/md/BuildingList.svelte';
	import Header from '$lib/components/md/Header.svelte';
	import PropertyToolbar from '$lib/components/md/PropertyToolbar.svelte';
	import UnitDetailPanel from '$lib/components/lg/UnitDetailPanel.svelte';
	import type { Building, Section } from '$lib/types/dashboard';

	let selectedUnit = $state<string | null>(null);
	let selectedBuilding = $state<Building | null>(null);

	// Hardcoded buildings + units
	let buildings = $state<Building[]>([
		{
			id: 'b1',
			address: '3466 Belmont Terrace',
			units: Array.from({ length: 10 }, (_, i) => `Unit 70${i}`)
		},
		{
			id: 'b2',
			address: '1021 Pacific Ave',
			units: Array.from({ length: 6 }, (_, i) => `Unit 20${i}`)
		},
		{
			id: 'b3',
			address: '778 Market Street',
			units: Array.from({ length: 14 }, (_, i) => `Unit 3${i < 10 ? '0' + i : i}`)
		}
	]);

	// Stubs so buttons do something for now
	const addUnitToBuilding = (buildingId: string) => {
		buildings = buildings.map((b) => {
			if (b.id !== buildingId) return b;
			const nextIndex = b.units.length;
			return {
				...b,
				units: [...b.units, `Unit NEW${nextIndex}`]
			};
		});
	};

	const addProperty = () => {
		const nextIndex = buildings.length + 1;
		buildings = [
			...buildings,
			{
				id: `b${nextIndex}`,
				address: `New Property ${nextIndex}`,
				units: []
			}
		];
	};

	// Example sections (replace per-unit later)
	const sections = $state<Section[]>([
		{ id: 'kitchen', label: 'Kitchen', photos: null },
		{ id: 'bathroom', label: 'Bathroom', photos: null },
		{ id: 'bedroom', label: 'Bedroom', photos: null },
		{ id: 'living', label: 'Living', photos: null },
		{ id: 'other', label: 'Other', photos: null }
	]);
</script>

<div class="flex h-dvh w-full flex-col bg-stone-50">
	<Header />

	<div class="relative flex min-h-0 flex-1 flex-row overflow-hidden">
		<div class="flex min-h-0 w-full flex-col gap-4 overflow-y-auto px-10 py-6">
			<PropertyToolbar onAddProperty={addProperty} />

			<BuildingList
				{buildings}
				onAddUnit={addUnitToBuilding}
				onSelectUnit={(building, unit) => {
					selectedUnit = unit;
					selectedBuilding = building;
				}}
			/>
		</div>

		<UnitDetailPanel
			{sections}
			{selectedUnit}
			{selectedBuilding}
			onClose={() => {
				selectedUnit = null;
				selectedBuilding = null;
			}}
		/>
	</div>
</div>
