<script lang="ts">
	import { fly } from 'svelte/transition';

	type UnitStatus = 'Not started' | 'In progress' | 'Done';
	type DamageSeverity = 'Good' | 'Moderate' | 'Severe';

	type Unit = {
		id: string;
		title: string;
		status: UnitStatus;
	};

	type Property = {
		id: string;
		address: string;
		expanded: boolean;
		units: Unit[];
	};

	type Snapshot = {
		severity: DamageSeverity;
		timestamp: string;
		hasPhoto?: boolean;
	};

	type SectionDetail = {
		name: string;
		snapshots: Snapshot[];
	};

	let properties = $state<Property[]>([
		{
			id: 'g1',
			address: '3466 Belmont Terr.',
			expanded: true,
			units: [
				{ id: 'g1-t1', title: 'Unit 100', status: 'Not started' },
				{ id: 'g1-t2', title: 'Unit 200', status: 'Not started' },
				{ id: 'g1-t3', title: 'Unit 300', status: 'Not started' }
			]
		},
		{
			id: 'g2',
			address: '812 S 6th St.',
			expanded: false,
			units: [
				{ id: 'g2-t1', title: 'Unit 100', status: 'Not started' },
				{ id: 'g2-t2', title: 'Unit 200', status: 'Not started' },
				{ id: 'g2-t3', title: 'Unit 300', status: 'Not started' }
			]
		}
	]);

	const detailSections: SectionDetail[] = [
		{
			name: 'Kitchen',
			snapshots: [
				{ severity: 'Severe', timestamp: 'Mar 2, 2024 • 2:15 PM', hasPhoto: true },
				{ severity: 'Moderate', timestamp: 'Mar 5, 2024 • 8:05 AM', hasPhoto: false }
			]
		},
		{
			name: 'Bathroom',
			snapshots: [
				{ severity: 'Moderate', timestamp: 'Mar 1, 2024 • 4:18 PM' },
				{ severity: 'Good', timestamp: 'Mar 6, 2024 • 10:02 AM' }
			]
		},
		{
			name: 'Living Room',
			snapshots: [
				{ severity: 'Severe', timestamp: 'Feb 27, 2024 • 5:44 PM' },
				{ severity: 'Good', timestamp: 'Mar 4, 2024 • 12:31 PM' }
			]
		},
		{
			name: 'Bedroom 1',
			snapshots: [
				{ severity: 'Moderate', timestamp: 'Mar 3, 2024 • 9:20 AM' },
				{ severity: 'Good', timestamp: 'Mar 6, 2024 • 6:50 PM' }
			]
		}
	];

	let selectedUnit: Unit | null = $state(null);
	let openStatusUnitId: string | null = $state(null);

	function toggleProperty(i: number) {
		properties[i].expanded = !properties[i].expanded;
		properties = [...properties];
	}

	function openSidePeek(unit: Unit) {
		selectedUnit = unit;
	}

	function closeSidePeek() {
		selectedUnit = null;
	}

	function toggleStatusDropdown(unitId: string) {
		openStatusUnitId = openStatusUnitId === unitId ? null : unitId;
	}

	function setUnitStatus(propertyIndex: number, unitIndex: number, status: UnitStatus) {
		properties[propertyIndex].units[unitIndex].status = status;
		properties = [...properties];
		openStatusUnitId = null;
	}

	function statusClasses(status: UnitStatus) {
		if (status === 'In progress') return 'bg-blue-500/15 text-blue-700 border-blue-500/30';
		if (status === 'Done') return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
		return 'bg-stone-500/15 text-stone-700 border-stone-500/30';
	}

	function damageTagClasses(severity: DamageSeverity) {
		if (severity === 'Severe') return 'bg-rose-500/15 text-rose-700';
		if (severity === 'Moderate') return 'bg-amber-500/15 text-amber-700';
		return 'bg-emerald-500/15 text-emerald-700';
	}
</script>

<div class="flex min-h-screen w-full flex-col bg-stone-50 p-20 font-sans">
	<h1 class="mb-10 text-4xl font-medium text-stone-900">Dashboard</h1>

	{#each properties as property, i (property.id)}
		<div class="mb-4">
			<!-- property row -->
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
						class="text-md flex items-center gap-2 rounded-md px-2 py-0.5 transition hover:bg-stone-200"
					>
						<span class="relative inline-flex h-3 w-3 items-center justify-center">
							<span class="absolute h-full w-full rounded-full bg-emerald-300/40"></span>
							<span class="relative h-2 w-2 rounded-full bg-emerald-500"></span>
						</span>
						{property.address}
					</div>
				</div>
			</div>

			{#if property.expanded}
				<div class="mt-2">
					<!-- units header -->
					<div
						class="grid grid-cols-[240px_1fr] border-b border-stone-200 text-sm font-medium tracking-wide text-stone-500 uppercase"
					>
						<div class="px-3 py-2">Unit name</div>
						<div class="px-3 py-2">Status</div>
					</div>

					<!-- units -->
					{#each property.units as unit, j (unit.id)}
						<div class="grid grid-cols-[240px_1fr] border-b border-stone-200">
							<!-- unit name -->
							<button
								class="flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700"
								onclick={() => openSidePeek(unit)}
							>
								<span class="h-2 w-2 rounded-full bg-emerald-400"></span>
								{unit.title}
							</button>

							<!-- status cell (clickable) -->
							<div class="border-l border-stone-200 px-3 py-2">
								<div class="relative">
									<button
										type="button"
										onclick={() => toggleStatusDropdown(unit.id)}
										class={`inline-flex w-full items-center justify-between gap-2 rounded-full border px-3 py-1 text-sm ${statusClasses(unit.status)} hover:opacity-80`}
										aria-haspopup="listbox"
										aria-expanded={openStatusUnitId === unit.id}
									>
										<span class="flex items-center gap-2">
											<span class="h-2 w-2 rounded-full bg-current opacity-70"></span>
											{unit.status}
										</span>
										<svg class="h-3 w-3 opacity-70" viewBox="0 0 12 12" fill="currentColor">
											<path d="M2 4l4 4 4-4z" />
										</svg>
									</button>

									{#if openStatusUnitId === unit.id}
										<div
											class="absolute top-9 right-0 z-10 w-44 rounded-md border border-stone-200 bg-white p-1 shadow-lg"
											role="listbox"
										>
											{#each ['Not started', 'In progress', 'Done'] as UnitStatus[] as s}
												<button
													type="button"
													onclick={() => setUnitStatus(i, j, s)}
													class="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-stone-700 hover:bg-stone-100"
													role="option"
													aria-selected={unit.status === s}
												>
													<span>{s}</span>
													{#if unit.status === s}
														<span class="text-stone-400">✓</span>
													{/if}
												</button>
											{/each}
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/each}

	{#if selectedUnit}
		<aside
			class="fixed inset-y-0 right-0 z-30 flex h-full w-1/2 min-w-[320px] flex-col border-l border-stone-200 bg-white p-6 pb-0 shadow-xl"
			transition:fly={{ x: 200, duration: 200 }}
			aria-label="Unit details"
		>
			<div class="flex items-center justify-between border-b border-stone-200 pb-4">
				<div>
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
			<div class="mt-6 flex-1 space-y-6 overflow-y-auto pr-2 pb-6 text-stone-700">
				{#each detailSections as section}
					<div class="space-y-4">
						<p class="text-sm font-medium tracking-wide text-stone-500 uppercase">{section.name}</p>
						<div class="grid grid-cols-2 gap-4">
							{#each section.snapshots as snapshot}
								{#if snapshot.hasPhoto !== false}
									<div class="overflow-hidden rounded-lg border border-stone-200 bg-white">
										<div class="relative h-50 bg-stone-300"></div>
										<div
											class="flex items-center justify-between bg-stone-100 px-3 py-2 text-xs font-medium text-stone-500"
										>
											<span
												class={`rounded-full px-2 py-0.5 text-xs font-semibold ${damageTagClasses(snapshot.severity)}`}
											>
												{snapshot.severity}
											</span>
											<span class="text-[11px] text-stone-400">{snapshot.timestamp}</span>
										</div>
									</div>
								{:else}
									<div
										class="overflow-hidden rounded-lg border border-dashed border-stone-200 bg-white"
									>
										<div class="relative h-50 bg-transparent"></div>
										<div
											class="flex items-center justify-between bg-stone-100 px-3 py-2 text-xs font-medium text-stone-500"
										>
											<span class={`rounded-full px-2 py-0.5 text-xs font-semibold`}>
												No Status
											</span>
										</div>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</aside>
	{/if}
</div>
