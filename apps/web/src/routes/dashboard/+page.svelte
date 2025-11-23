<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import { fly } from 'svelte/transition';

	let selectedUnit = $state<string | null>(null);
	let selectedBuilding = $state<Building | null>(null);

	type Triplet = {
		movein?: string;
		moveout?: string;
		repair?: string;
	};

	type Section = {
		id: string;
		label: string;
		photos: Triplet | null;
	};

	type Building = {
		id: string;
		address: string;
		units: string[];
	};

	const shortAddr = (addr: string, n = 18) => (addr.length > n ? addr.slice(0, n) + '…' : addr);

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
			<!-- Search row + Add property -->
			<div class="flex w-full items-center justify-between">
				<div class="flex flex-row gap-2">
					<input
						class="w-70 appearance-none rounded-md border border-stone-200 bg-white p-2 text-xs text-stone-900 ring-0
							   outline-none placeholder:text-stone-400
							   focus:border-stone-300 focus:ring-1 focus:ring-stone-300 focus:ring-offset-0
							   focus-visible:ring-1 focus-visible:ring-stone-300 focus-visible:outline-none"
						placeholder="All Properties..."
					/>

					<input
						class="w-70 appearance-none rounded-md border border-stone-200 bg-white p-2 text-xs text-stone-900 ring-0
							   outline-none placeholder:text-stone-400
							   focus:border-stone-300 focus:ring-1 focus:ring-stone-300 focus:ring-offset-0
							   focus-visible:ring-1 focus-visible:ring-stone-300 focus-visible:outline-none"
						placeholder="All Units..."
					/>
					<button
						type="button"
						class="flex flex-row items-center gap-1 rounded-md border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
						onclick={addProperty}
					>
						<span class="flex h-2 w-2 rounded-full bg-red-400" />
						Status
					</button>
				</div>

				<button
					type="button"
					class="rounded-md border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
					onclick={addProperty}
				>
					+ Add property
				</button>
			</div>

			<!-- Buildings list -->
			<div class="flex flex-col gap-4">
				{#each buildings as b (b.id)}
					<div class="flex flex-col gap-1">
						<div
							class="flex flex-col divide-y divide-stone-200 rounded-md border border-stone-200 bg-white"
						>
							<!-- Building header row with Add Unit button -->
							<div class="flex items-center justify-between p-3">
								<span class="flex flex-row items-center gap-2 text-sm font-medium text-stone-600">
									<span class="flex h-2 w-2 rounded-full bg-red-400" />
									{b.address}
								</span>

								<button
									type="button"
									class="rounded-md px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
									onclick={() => addUnitToBuilding(b.id)}
								>
									+ Add unit
								</button>
							</div>

							{#each b.units as unit (unit)}
								<button
									class="flex flex-row items-center justify-between p-3 text-sm font-normal text-stone-600 transition hover:bg-stone-100"
									onclick={() => {
										selectedUnit = unit;
										selectedBuilding = b;
									}}
								>
									{unit}
									<div class="flex flex-row gap-4">
										<div
											class="flex flex-row items-center gap-2 rounded-full border border-stone-200 p-1 px-2 text-xs"
										>
											<span class="flex h-2 w-2 rounded-full bg-red-400" />Kitchen
										</div>
									</div>
								</button>
							{/each}

							{#if b.units.length === 0}
								<div class="p-3 text-xs text-stone-400">No units yet.</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- RIGHT overlay -->
		{#if selectedUnit}
			<div
				class="absolute top-0 right-0 z-20 h-full w-full overflow-y-auto border-l border-stone-200 bg-stone-50 px-8 py-8 text-lg font-semibold text-stone-700 md:w-1/2"
				transition:fly={{ duration: 200, x: 10 }}
			>
				<div class="flex w-full items-center justify-between text-sm font-medium text-stone-400">
					<button
						class="text-xs text-stone-400 hover:text-stone-900"
						onclick={() => {
							selectedUnit = null;
							selectedBuilding = null;
						}}
					>
						>>
					</button>
					{selectedUnit}/{selectedBuilding ? shortAddr(selectedBuilding.address) : ''}
				</div>

				<div class="mt-6 flex flex-col gap-8">
					{#each sections as section (section.id)}
						<section class="flex flex-col">
							<h2 class="mb-4 text-xl font-semibold text-stone-900">
								{section.label}
							</h2>

							{#if section.photos}
								<div class="grid grid-cols-3 gap-3">
									{#each ['movein', 'moveout', 'repair'] as kind}
										<div class="flex flex-col gap-2">
											<div
												class="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-stone-200 bg-white"
											>
												{#if section.photos[kind]}
													<img
														src={section.photos[kind]}
														alt={`${section.label} ${kind}`}
														class="h-full w-full object-cover"
													/>
												{:else}
													<div
														class="flex h-full w-full items-center justify-center text-xs text-stone-400"
													>
														No {kind} photo
													</div>
												{/if}
											</div>
											<div class="text-[11px] font-medium text-stone-500 capitalize">
												{kind}
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<span class="text-sm text-stone-600">New item</span>
								<div class="grid grid-cols-3 gap-3">
									{#each ['movein', 'moveout', 'repair'] as kind}
										<div class="flex flex-col gap-2">
											<div
												class="flex aspect-[4/3] w-full items-center justify-center rounded-md border border-dashed border-stone-300 bg-white text-xs text-stone-400"
											>
												Add {kind}
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</section>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
