<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { Property, UnitSummary } from '$lib/types/dashboard';
	import Group from '../sm/Group.svelte';
	import supabase from '$lib/supabaseClient';
	import StatusDot from '../sm/StatusDot.svelte';

	const noop = () => {};

	let {
		selectedUnit = null,
		selectedProperty = null,
		onClose = noop,
		isFullscreen = false,
		onToggleFullscreen = noop,
		onStageChange = noop
	} = $props<{
		selectedUnit?: UnitSummary | null;
		selectedProperty?: Property | null;
		onClose?: () => void;
		isFullscreen?: boolean;
		onToggleFullscreen?: () => void;
		onStageChange?: (stage: StageValue) => void;
	}>();

	const shortAddr = (addr: string, n = 18) => (addr.length > n ? addr.slice(0, n) + '…' : addr);

	const handleClose = () => {
		onClose();
	};

	const BUCKET = 'unit-images';

	function imageUrl(path: string) {
		const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
		return data.publicUrl;
	}

	// ---------- STAGE DROPDOWN ----------

	type StageValue = 'Vacant' | 'Move-in' | 'Move-out';

	const STAGE_OPTIONS: StageValue[] = ['Vacant', 'Move-in', 'Move-out'];

	let stageOpen = $state(false);
	let unitStage = $state<StageValue>('Vacant');

	// sync local stage whenever selectedUnit changes
	$effect(() => {
		if (selectedUnit?.stage) {
			unitStage = selectedUnit.stage as StageValue;
		}
	});

	async function updateStage(next: StageValue) {
		if (!selectedUnit) return;

		stageOpen = false;

		// optimistic UI
		const prevStage = unitStage;
		unitStage = next;

		const { error } = await supabase
			.from('units')
			.update({ stage: next })
			.eq('id', selectedUnit.id);

		if (error) {
			console.error('update stage error', error);
			unitStage = prevStage; // revert
			return;
		}

		// inform parent that the stage changed for this unit
		onStageChange(next);
	}

	// ---------- GROUPS LOADING ----------

	async function loadGroups(unitId: string) {
		const { data, error } = await supabase
			.from('groups')
			.select(
				`
				  id, name, room_id, description, tenancy_id,
				  rooms!inner ( id, unit_id, name ),
				  images ( id, group_id, phase, path, mime_type, created_at, notes )
    `
			)
			.eq('rooms.unit_id', unitId);

		if (error) {
			console.error('loadGroups error', error);
			return [];
		}

		const rawGroups = data ?? [];

		const enriched = rawGroups.map((g) => {
			const images = (g.images ?? []).map((img) => ({
				...img,
				url: imageUrl(img.path)
			}));

			const pick = (phase: 'move_in' | 'move_out' | 'repair') =>
				images.find((i) => i.phase === phase) ?? null;

			return {
				id: g.id,
				name: g.name,
				room: g.rooms.name,
				description: g.description,
				tenancy_id: g.tenancy_id,

				movein: pick('move_in'),
				moveout: pick('move_out'),
				repair: pick('repair')
			};
		});

		return enriched;
	}

	$effect(() => {
		if (!selectedUnit) return;
		loadGroups(selectedUnit.id).then((enrichedGroups) => (groups = enrichedGroups));
	});

	let groups = $state<any[]>([]);
	let selectedGroup = $state(null);

	let groupSearch = $state('');

	const filteredGroups = $derived(
		!groupSearch.trim()
			? groups
			: groups.filter((g) => {
					const q = groupSearch.toLowerCase();
					return (
						(g.name && g.name.toLowerCase().includes(q)) ||
						(g.room && g.room.toLowerCase().includes(q)) ||
						(g.description && g.description.toLowerCase().includes(q))
					);
				})
	);
</script>

{#if selectedUnit}
	<div
		class={`absolute top-0 right-0 z-20 h-full overflow-y-auto border-l border-stone-200 bg-stone-50 text-lg font-semibold text-stone-700 ${
			isFullscreen ? 'left-0 w-full' : 'w-1/2'
		}`}
		transition:fly={{ duration: 200, x: 10 }}
	>
		<div class="sticky top-0 z-20 mb-4 flex w-full flex-col gap-2 bg-stone-50 p-3">
			<div class="flex w-full flex-row justify-between">
				<div class="truncate text-xs font-normal text-stone-500">
					{selectedUnit ? selectedUnit.label : ''} /
					{selectedProperty ? shortAddr(selectedProperty.name) : ''}
				</div>
				<div class="flex items-center gap-1">
					<button
						class="flex h-5 w-5 items-center justify-center rounded-sm text-stone-500 transition hover:bg-stone-200 hover:text-stone-500"
						onclick={onToggleFullscreen}
						aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="currentColor"
							class="bi bi-arrows-angle-expand h-3 w-3"
							viewBox="0 0 16 16"
						>
							{#if isFullscreen}
								<path
									fill-rule="evenodd"
									d="M.172 15.828a.5.5 0 0 0 .707 0l4.096-4.096V14.5a.5.5 0 1 0 1 0v-3.975a.5.5 0 0 0-.5-.5H1.5a.5.5 0 0 0 0 1h2.768L.172 15.121a.5.5 0 0 0 0 .707M15.828.172a.5.5 0 0 0-.707 0l-4.096 4.096V1.5a.5.5 0 1 0-1 0v3.975a.5.5 0 0 0 .5.5H14.5a.5.5 0 0 0 0-1h-2.768L15.828.879a.5.5 0 0 0 0-.707"
								/>
							{:else}
								<path
									fill-rule="evenodd"
									d="M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707m4.344-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707"
								/>
							{/if}
						</svg>
					</button>
					<button
						class="flex h-5 w-5 items-center justify-center rounded-sm text-stone-500 transition hover:bg-stone-200 hover:text-stone-500"
						onclick={handleClose}
						aria-label="Collapse"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 16 16"
							class="h-4 w-4"
							fill="none"
							stroke="currentColor"
							stroke-width="1"
							stroke-linecap="round"
						>
							<line x1="4" y1="4" x2="12" y2="12" />
							<line x1="12" y1="4" x2="4" y2="12" />
						</svg>
					</button>
				</div>
			</div>

			<div class="flex w-full flex-row gap-2">
				<div class="relative">
					<button
						type="button"
						class="flex h-full w-28 shrink-0 flex-row items-center justify-between rounded-md border border-stone-200 bg-white px-3 py-1 text-xs font-normal"
						onclick={() => (stageOpen = !stageOpen)}
					>
						<div class="flex flex-row items-center gap-1">
							<StatusDot stage={unitStage} />
							{unitStage}
						</div>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
							stroke-linejoin="round"
							class={`h-4 w-4 transition-transform ${stageOpen ? 'rotate-180' : ''}`}
							aria-hidden="true"
						>
							<path d="M6 9l6 6 6-6" />
						</svg>
					</button>

					{#if stageOpen}
						<div
							class="absolute left-0 z-30 mt-1 w-28 rounded-md border border-stone-200 bg-white py-1 text-xs shadow-lg"
						>
							{#each STAGE_OPTIONS as option}
								<button
									type="button"
									class={`flex w-full items-center justify-between px-3 py-1.5 text-left ${
										unitStage === option ? 'bg-stone-200' : 'hover:bg-stone-100'
									}`}
									onclick={() => updateStage(option)}
								>
									<div class="flex flex-row items-center gap-1 font-normal">
										<StatusDot stage={option} />
										{option}
									</div>
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Search -->
				<label
					class="inline-flex h-8 w-full items-center rounded-md border border-stone-200 bg-white px-2 text-xs transition focus-within:ring-1 focus-within:ring-stone-300"
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
						class="w-40 appearance-none border-0 bg-transparent pl-2 text-xs font-light text-stone-900 placeholder:font-light placeholder:text-stone-400 focus:ring-0 focus:outline-none"
						placeholder="All groups..."
						bind:value={groupSearch}
					/>
				</label>
			</div>
		</div>

		<div class="px-4 pb-6">
			<div class={`grid gap-4 ${isFullscreen ? 'grid-cols-4' : 'grid-cols-2'}`}>
				{#each filteredGroups as group (group.id)}
					<button type="button" class="text-left" onclick={() => (selectedGroup = group)}>
						<Group
							name={group.name}
							room={group.room}
							movein={group.movein}
							moveout={group.moveout}
							repair={group.repair}
						/>
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

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
