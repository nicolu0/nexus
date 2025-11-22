<script lang="ts">
	import { fly } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import supabase from '$lib/supabaseClient';
	import {
		propertiesStore,
		fetchProperties,
		createPropertyOptimistic,
		updatePropertyAt,
		updateUnitStatus,
		type UnitRecord,
		type UnitStatus
	} from '$lib/stores/properties';
	import nexusLogo from '$lib/assets/nexus.svg';

	type DamageSeverity = 'Good' | 'Moderate' | 'Severe';

	type Snapshot = {
		severity: DamageSeverity;
		timestamp: string;
		hasPhoto?: boolean;
	};

	type SectionDetail = {
		name: string;
		snapshots: Snapshot[];
	};

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

	let selectedUnit: UnitRecord | null = $state(null);
	let openStatusUnitId: string | null = $state(null);
	let isLoadingProperties = $state(true);
	let loadError = $state('');
	let showCreatePropertyModal = $state(false);
	let newPropertyAddress = $state('');
	let newPropertyUnits = $state(1);
	let createPropertyLoading = $state(false);
	let createPropertyError = $state('');

	onMount(async () => {
		await loadPropertiesFromSupabase();
	});

	$effect(() => {
		if (!isLoadingProperties && $propertiesStore.length === 0) {
			showCreatePropertyModal = true;
		}
	});

	async function loadPropertiesFromSupabase() {
		isLoadingProperties = true;
		loadError = '';
		try {
			const results = await fetchProperties();
			if (results.length === 0) {
				showCreatePropertyModal = true;
			}
		} catch (err) {
			loadError = err instanceof Error ? err.message : 'Unable to load properties.';
		} finally {
			isLoadingProperties = false;
		}
	}

	function toggleProperty(i: number) {
		updatePropertyAt(i, (property) => ({ ...property, expanded: !property.expanded }));
	}

	function openSidePeek(unit: UnitRecord) {
		selectedUnit = unit;
	}

	function closeSidePeek() {
		selectedUnit = null;
	}

	function toggleStatusDropdown(unitId: string) {
		openStatusUnitId = openStatusUnitId === unitId ? null : unitId;
	}

	function setUnitStatus(propertyIndex: number, unitIndex: number, status: UnitStatus) {
		updateUnitStatus(propertyIndex, unitIndex, status);
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

	async function handleCreateProperty(event: SubmitEvent) {
		event.preventDefault();
		if (createPropertyLoading) return;
		createPropertyError = '';

		const trimmed = newPropertyAddress.trim();
		if (!trimmed) {
			createPropertyError = 'Address is required.';
			return;
		}

		createPropertyLoading = true;
		const { success, error } = await createPropertyOptimistic({
			addressLine1: trimmed,
			unitsCount: Number(newPropertyUnits) || 0
		});
		createPropertyLoading = false;

		if (!success) {
			createPropertyError = error ?? 'Unable to create property.';
			return;
		}

		newPropertyAddress = '';
		newPropertyUnits = 1;
		showCreatePropertyModal = false;
	}

	function openCreatePropertyModal() {
		showCreatePropertyModal = true;
		createPropertyError = '';
	}

	function closeCreatePropertyModal() {
		createPropertyError = '';
		showCreatePropertyModal = false;
	}

	async function logout() {
		await supabase.auth.signOut();
		await goto('/');
	}
</script>

<div class="flex min-h-screen w-full flex-col bg-stone-50 font-sans">
	<header
		class="sticky top-0 z-20 flex w-full items-center justify-between border-b border-stone-200 bg-stone-50 px-8 py-3"
	>
		<div class="flex items-center gap-1">
			<img src={nexusLogo} alt="Nexus logo" class="h-6 w-6" />
			<span class="text-lg font-semibold tracking-tight text-stone-700">Nexus</span>
		</div>
		<div class="flex items-center gap-4">
			<button
				type="button"
				onclick={logout}
				class="flex items-center rounded-full bg-stone-200 p-2 transition hover:border-stone-300"
				aria-label="Sign out"
			>
				<span class="font-mono tracking-tighter text-stone-500">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="currentColor"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						shape-rendering="geometricPrecision"
						class="h-4 w-4 transition-colors duration-200"
					>
						<path d="M20 21.5v-2.5a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2.5h16" />
						<circle cx="12" cy="7" r="4" />
					</svg>
				</span>
			</button>
		</div>
	</header>

	<div class="flex-1 px-20 py-10">
		<div class="mb-6 flex items-center justify-between">
			<h1 class="text-4xl font-medium text-stone-900">Dashboard</h1>
			<button
				type="button"
				onclick={openCreatePropertyModal}
				class="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:border-stone-300 hover:text-stone-900"
			>
				Add property
			</button>
		</div>

		{#if isLoadingProperties}
			<div
				class="rounded-xl border border-dashed border-stone-300 bg-white/80 px-6 py-10 text-center text-stone-500"
			>
				Loading your properties...
			</div>
		{:else if loadError}
			<div class="rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-rose-700">
				{loadError}
			</div>
		{:else if $propertiesStore.length === 0}
			<div
				class="rounded-xl border border-dashed border-stone-200 bg-white/70 px-6 py-10 text-center text-stone-500"
			>
				No properties yet. Add your first one to get started.
			</div>
		{/if}

		{#each $propertiesStore as property, i (property.id)}
			<div
				class={`mb-4 border-b border-stone-200 pb-4 last:border-b-0 last:pb-0 ${
					property.expanded ? 'border-transparent pb-0' : ''
				}`}
			>
				<div class="grid w-full grid-cols-[1fr_auto] items-center gap-6 text-left">
					<div class="flex items-center gap-2 font-medium text-stone-700">
						<button
							type="button"
							onclick={() => toggleProperty(i)}
							class="rounded-md p-1 transition hover:bg-stone-200"
							aria-label={(property.expanded ? 'Collapse ' : 'Expand ') + property.name}
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
							{property.name}
						</div>
					</div>
					<div class="text-sm text-stone-500">{property.address}</div>
				</div>

				{#if property.expanded}
					<div class="mt-2">
						<div
							class="grid grid-cols-[240px_1fr] border-b border-stone-200 text-sm font-medium tracking-wide text-stone-500 uppercase"
						>
							<div class="px-3 py-2">Unit name</div>
							<div class="px-3 py-2">Status</div>
						</div>

						{#each property.units as unit, j (unit.id)}
							<div class="grid grid-cols-[240px_1fr] border-b border-stone-200">
								<button
									type="button"
									class="flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700"
									onclick={() => openSidePeek(unit)}
								>
									<span class="h-2 w-2 rounded-full bg-emerald-400"></span>
									{unit.title}
								</button>

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
												{#each ['Not started', 'In progress', 'Done'] as status}
													<button
														type="button"
														onclick={() => setUnitStatus(i, j, status as UnitStatus)}
														class="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-stone-700 hover:bg-stone-100"
														role="option"
														aria-selected={unit.status === status}
													>
														<span>{status}</span>
														{#if unit.status === status}
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
				<div class="flex items-center justify-between border-b border-stone-200 pb-2">
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
				<div class="flex-1 space-y-6 overflow-y-auto pt-4 pr-2 pb-6 text-stone-700">
					{#each detailSections as section}
						<div class="space-y-4">
							<p class="text-sm font-medium tracking-wide text-stone-500 uppercase">
								{section.name}
							</p>
							<div class="grid grid-cols-2 gap-4">
								{#each section.snapshots as snapshot}
									{#if snapshot.hasPhoto !== false}
										<div class="overflow-hidden rounded-lg border border-stone-200 bg-white">
											<div class="h-50 bg-stone-300"></div>
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
										<button
											type="button"
											class="flex h-50 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dotted border-stone-300 bg-stone-50 text-xs font-semibold tracking-wide text-stone-400 uppercase hover:border-stone-400 hover:text-stone-500"
										>
											<span class="text-base">＋</span>
											Add photo
										</button>
									{/if}
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</aside>
		{/if}
	</div>
</div>

{#if showCreatePropertyModal}
	<div
		class="fixed inset-0 z-[140] flex items-center justify-center bg-stone-50/80"
		role="dialog"
		aria-modal="true"
		aria-label="Add property"
	>
		<div
			in:fly={{ y: 12, duration: 200 }}
			class="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 text-stone-800 shadow-[0_12px_32px_rgba(15,15,15,0.12)]"
		>
			<div class="flex items-center justify-between">
				<div class="text-sm font-semibold tracking-tight text-stone-900">
					Add your first property
				</div>
				<button
					type="button"
					onclick={closeCreatePropertyModal}
					class="rounded-full p-1 text-stone-500 hover:text-stone-800"
					aria-label="Close add property"
				>
					<svg
						viewBox="0 0 24 24"
						class="h-4 w-4"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M6 6l12 12M6 18L18 6" stroke-linecap="round" />
					</svg>
				</button>
			</div>

			<p class="mt-2 text-xs text-stone-500">
				Enter the address and number of units. We’ll add placeholders instantly and sync them to
				Supabase.
			</p>

			<form class="mt-5 space-y-4" onsubmit={handleCreateProperty}>
				<label class="block text-xs font-semibold tracking-wide text-stone-500 uppercase">
					Property address
					<input
						type="text"
						required
						class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm transition outline-none placeholder:text-stone-400 focus:border-stone-400"
						placeholder="123 Main St, Springfield"
						bind:value={newPropertyAddress}
					/>
				</label>
				<label class="block text-xs font-semibold tracking-wide text-stone-500 uppercase">
					Number of units
					<input
						type="number"
						min="0"
						class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm transition outline-none placeholder:text-stone-400 focus:border-stone-400"
						bind:value={newPropertyUnits}
					/>
				</label>
				{#if createPropertyError}
					<p class="text-sm text-rose-600">{createPropertyError}</p>
				{/if}
				<button
					type="submit"
					class="w-full rounded-xl bg-stone-900 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
					disabled={createPropertyLoading}
				>
					{#if createPropertyLoading}
						Saving...
					{:else}
						Add property
					{/if}
				</button>
			</form>
		</div>
	</div>
{/if}
