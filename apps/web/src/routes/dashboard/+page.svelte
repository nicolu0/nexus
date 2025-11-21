<script lang="ts">
	import { fly } from 'svelte/transition';

	type Unit = {
		id: string;
		title: string;
	};

	type Property = {
		id: string;
		name: string;
		address: string;
		expanded: boolean;
		units: Unit[];
	};

	let properties = $state<Property[]>([
		{
			id: 'g1',
			name: 'Property 1',
			address: '3466 Belmont Terr.',
			expanded: true,
			units: [
				{
					id: 't1',
					title: 'Unit 1'
				},
				{
					id: 't2',
					title: 'Unit 2'
				},
				{
					id: 't3',
					title: 'Unit 3'
				}
			]
		},
		{
			id: 'g2',
			name: 'Property 2',
			address: '812 S 6th St.',
			expanded: false,
			units: [
				{
					id: 't1',
					title: 'Unit 1'
				},
				{
					id: 't2',
					title: 'Unit 2'
				},
				{
					id: 't3',
					title: 'Unit 3'
				}
			]
		}
	]);

	let selectedUnit: Unit | null = $state(null);

	function toggleProperty(i: number) {
		properties[i].expanded = !properties[i].expanded;
		// Svelte 5: reassign to trigger reactivity for nested change
		properties = [...properties];
	}

	function openSidePeek(unit: Unit) {
		selectedUnit = unit;
	}

	function closeSidePeek() {
		selectedUnit = null;
	}
</script>

<div class="flex min-h-screen w-full flex-col bg-stone-50 p-20 font-sans">
	<h1 class="mb-10 text-4xl font-medium text-stone-900">Dashboard</h1>
	{#each properties as property, i (property.id)}
		<div class="mb-4">
			<div class="grid w-full grid-cols-[1fr_auto] items-center gap-6 text-left">
				<div class="flex items-center gap-2 font-medium text-stone-700">
					<button
						type="button"
						onclick={() => toggleProperty(i)}
						class="rounded-md p-1 transition hover:bg-stone-200"
					>
						<svg
							class={'h-4 w-4 transition-transform ' + (property.expanded ? 'rotate-90' : '')}
							viewBox="0 0 12 12"
							fill="currentColor"
						>
							<path d="M4 2l5 4-5 4z" />
						</svg>
					</button>
					<div
						class="flex items-center gap-2 rounded-md px-2 py-0.5 text-lg transition hover:bg-stone-200"
					>
						<span class="relative inline-flex h-3 w-3 items-center justify-center">
							<span class="absolute h-full w-full rounded-full bg-emerald-300/40"></span>
							<span class="relative h-2 w-2 rounded-full bg-emerald-500"></span>
						</span>
						{property.name}
					</div>
				</div>
				<div class="text-sm text-stone-500">{property.address}</div>
			</div>

			{#if property.expanded}
				<div class="mt-6 pl-2">Unit Name</div>
				{#each property.units as unit (unit.id)}
					<button
						type="button"
						onclick={() => openSidePeek(unit)}
						class="grid w-full grid-cols-[1fr_180px_180px_140px] gap-4 border-b border-stone-700/30 py-2 text-left transition hover:bg-stone-200"
					>
						<div class="pl-2 text-stone-700">{unit.title}</div>
					</button>
				{/each}
			{/if}
		</div>
	{/each}

	{#if selectedUnit}
		<aside
			class="fixed inset-y-0 right-0 z-30 w-1/2 min-w-[320px] border-l border-stone-200 bg-white p-6 shadow-xl"
			transition:fly={{ x: 200, duration: 200 }}
			aria-label="Unit details"
		>
			<div class="flex items-center justify-between border-b border-stone-200 pb-4">
				<div>
					<p class="text-sm text-stone-400 uppercase">Unit</p>
					<h2 class="text-2xl font-semibold text-stone-900">{selectedUnit.title}</h2>
				</div>
				<button
					type="button"
					onclick={closeSidePeek}
					class="rounded border border-stone-200 px-3 py-1 text-sm text-stone-500 transition hover:bg-stone-100"
				>
					Close
				</button>
			</div>
			<div class="mt-6 space-y-4 text-stone-700">
				<p class="text-sm text-stone-500">Details</p>
				<p>
					This is placeholder content for <span class="font-medium">{selectedUnit.title}</span>.
					Replace with actual unit information.
				</p>
			</div>
		</aside>
	{/if}
</div>
