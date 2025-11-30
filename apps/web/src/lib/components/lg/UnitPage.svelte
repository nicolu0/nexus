<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { Property, UnitSummary } from '$lib/types/dashboard';
	import Group from '../sm/Group.svelte';
	import supabase from '$lib/supabaseClient';
	import GroupModal from '../modals/GroupModal.svelte';

	const noop = () => {};

	let {
		selectedUnit = null,
		selectedProperty = null,
		onClose = noop,
		isFullscreen = false,
		onToggleFullscreen = noop
	} = $props<{
		selectedUnit?: UnitSummary | null;
		selectedProperty?: Property | null;
		onClose?: () => void;
		isFullscreen?: boolean;
		onToggleFullscreen?: () => void;
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

	// ---------- GROUPS LOADING ----------

	type GroupImage = {
		id: string;
		url: string;
		created_at: string;
		phase: 'move_in' | 'move_out' | 'repair';
		notes?: string | null;
	};

	type EnrichedGroup = {
		id: string;
		name: string;
		room: string;
		in_repair: boolean;
		description?: string | null;
		tenancy_id?: string | null;
		movein: GroupImage | null;
		moveout: GroupImage | null;
		repair: GroupImage | null;
	};

	async function loadGroups(unitId: string) {
		const { data, error } = await supabase
			.from('groups')
			.select(
				`
			id, name, room_id, description, tenancy_id,
			rooms!inner ( id, unit_id, name ),
			in_repair,
			images (
				id,
				group_id,
				session_id,
				path,
				mime_type,
				created_at,
				notes,
				damaged,
				sessions (
					id,
					phase
				)
			)
		`
			)
			.eq('rooms.unit_id', unitId);

		if (error) {
			console.error('loadGroups error', error);
			return [];
		}

		const rawGroups = data ?? [];
		console.log(rawGroups);

		const enriched = rawGroups.map((g) => {
			// 1) add URL + phase from sessions to each image
			const images = (g.images ?? []).map((img: any) => {
				const phase = img.sessions?.phase ?? null; // 'move_in' | 'move_out' | 'repair' | null

				return {
					id: img.id,
					url: imageUrl(img.path),
					created_at: img.created_at,
					damaged: img.damaged,
					phase,
					notes: img.notes ?? null
				} as GroupImage;
			});

			// 2) helper to pick image by phase
			const pick = (phase: 'move_in' | 'move_out' | 'repair') =>
				images.find((i) => i.phase === phase) ?? null;

			return {
				id: g.id,
				name: g.name,
				room: g.rooms.name,
				in_repair: g.in_repair,
				description: g.description,
				tenancy_id: g.tenancy_id,

				movein: pick('move_in'),
				moveout: pick('move_out'),
				repair: pick('repair')
			};
		});

		return enriched;
	}

	let groups = $state<EnrichedGroup[]>([]);
	let selectedGroup = $state<EnrichedGroup | null>(null);

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

	async function updateRepairStatus(groupId: string, value: boolean | null) {
		const prevGroups = groups;
		const prevSelectedGroup = selectedGroup;

		// update groups
		groups = groups.map((g) => (g.id === groupId ? { ...g, in_repair: value } : g));

		// update selectedGroup if it’s the same one
		if (selectedGroup && selectedGroup.id === groupId) {
			selectedGroup = { ...selectedGroup, in_repair: value };
		}

		const { error } = await supabase
			.from('groups')
			.update({ in_repair: value })
			.eq('id', groupId)
			.single();

		if (error) {
			console.error('updateRepairStatus error', error);
			groups = prevGroups;
			selectedGroup = prevSelectedGroup;
		}
	}
	$effect(() => {
		if (!selectedUnit) return;
		selectedGroup = null;
		loadGroups(selectedUnit.id).then((enrichedGroups) => (groups = enrichedGroups));
	});
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
				<button
					class="flex shrink-0 flex-row items-center gap-1 rounded-md border border-stone-200 bg-white px-2 text-sm font-normal text-stone-600"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="currentColor"
						class="bi bi-file-earmark-pdf-fill h-4 w-4"
						viewBox="0 0 16 16"
					>
						<path
							d="M5.523 12.424q.21-.124.459-.238a8 8 0 0 1-.45.606c-.28.337-.498.516-.635.572l-.035.012a.3.3 0 0 1-.026-.044c-.056-.11-.054-.216.04-.36.106-.165.319-.354.647-.548m2.455-1.647q-.178.037-.356.078a21 21 0 0 0 .5-1.05 12 12 0 0 0 .51.858q-.326.048-.654.114m2.525.939a4 4 0 0 1-.435-.41q.344.007.612.054c.317.057.466.147.518.209a.1.1 0 0 1 .026.064.44.44 0 0 1-.06.2.3.3 0 0 1-.094.124.1.1 0 0 1-.069.015c-.09-.003-.258-.066-.498-.256M8.278 6.97c-.04.244-.108.524-.2.829a5 5 0 0 1-.089-.346c-.076-.353-.087-.63-.046-.822.038-.177.11-.248.196-.283a.5.5 0 0 1 .145-.04c.013.03.028.092.032.198q.008.183-.038.465z"
						/>
						<path
							fill-rule="evenodd"
							d="M4 0h5.293A1 1 0 0 1 10 .293L13.707 4a1 1 0 0 1 .293.707V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2m5.5 1.5v2a1 1 0 0 0 1 1h2zM4.165 13.668c.09.18.23.343.438.419.207.075.412.04.58-.03.318-.13.635-.436.926-.786.333-.401.683-.927 1.021-1.51a11.7 11.7 0 0 1 1.997-.406c.3.383.61.713.91.95.28.22.603.403.934.417a.86.86 0 0 0 .51-.138c.155-.101.27-.247.354-.416.09-.181.145-.37.138-.563a.84.84 0 0 0-.2-.518c-.226-.27-.596-.4-.96-.465a5.8 5.8 0 0 0-1.335-.05 11 11 0 0 1-.98-1.686c.25-.66.437-1.284.52-1.794.036-.218.055-.426.048-.614a1.24 1.24 0 0 0-.127-.538.7.7 0 0 0-.477-.365c-.202-.043-.41 0-.601.077-.377.15-.576.47-.651.823-.073.34-.04.736.046 1.136.088.406.238.848.43 1.295a20 20 0 0 1-1.062 2.227 7.7 7.7 0 0 0-1.482.645c-.37.22-.699.48-.897.787-.21.326-.275.714-.08 1.103"
						/>
					</svg>
					Generate Statement</button
				>
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
							in_repair={group.in_repair}
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

{#if selectedGroup}
	<GroupModal
		{selectedGroup}
		onClose={() => (selectedGroup = null)}
		onRepairChange={updateRepairStatus}
	/>
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
