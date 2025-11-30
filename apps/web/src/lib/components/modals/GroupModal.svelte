<script lang="ts">
	type GroupImage = {
		id: string;
		url: string;
		created_at: string;
		notes?: string | null;
		phase: 'move_in' | 'move_out' | 'repair';
		// damaged is present in your data even if not declared here
		// damaged?: boolean | null;
	};

	type StageKey = 'movein' | 'moveout' | 'repair';

	type GroupDetail = {
		id: string;
		name: string;
		room?: string | null;
		description?: string | null;
		in_repair?: boolean | null;
	} & Record<StageKey, GroupImage | (GroupImage & { damaged?: boolean | null }) | null>;

	const {
		selectedGroup = null,
		onClose = () => {},
		onRepairChange = (_id: string, _value: boolean | null) => {}
	} = $props<{
		selectedGroup?: GroupDetail | null;
		onClose?: () => void;
		onRepairChange?: (groupId: string, value: boolean | null) => void;
	}>();

	function updateRepairStatus(value: boolean | null) {
		if (!selectedGroup) return;
		onRepairChange(selectedGroup.id, value);
	}

	const stageLabels: Record<StageKey, string> = {
		movein: 'Move-in',
		moveout: 'Move-out',
		repair: 'Repair'
	};

	const stages = $derived(
		(['movein', 'moveout', 'repair'] as StageKey[]).map((key) => {
			const img = selectedGroup ? (selectedGroup[key] as any) : null;
			return {
				key,
				label: stageLabels[key],
				image: img ?? null,
				damaged: img?.damaged ?? null
			};
		})
	);

	// true if any of the stages has damaged === true
	const anyDamaged = $derived(stages.some((stage) => stage.damaged === true));

	function formatTimestamp(image: GroupImage | null) {
		if (!image?.created_at) return '';
		const d = new Date(image.created_at);
		if (Number.isNaN(d.getTime())) return '';
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		const yy = String(d.getFullYear()).slice(-2);
		const hh = String(d.getHours()).padStart(2, '0');
		const min = String(d.getMinutes()).padStart(2, '0');
		return `${mm}/${dd}/${yy} ${hh}:${min}`;
	}

	function stopPropagation(event: Event) {
		event.stopPropagation();
	}

	const repairOptions = [
		{ value: null as boolean | null, label: 'Needs Repair' },
		{ value: false, label: 'In Repair' },
		{ value: true, label: 'Repaired' }
	];
	let showRepairDropdown = $state(false);

	function repairLabel(value: boolean | null | undefined): string {
		if (value === null || value === undefined) return 'Needs Repair';
		if (value === false) return 'In Repair';
		return 'Repaired';
	}

	function repairDotColor(value: boolean | null | undefined): string {
		if (value === null || value === undefined) return 'bg-red-500'; // Needs Repair
		if (value === false) return 'bg-amber-500'; // In Repair
		return 'bg-emerald-500'; // Repaired
	}

	function toggleRepairDropdown(event?: MouseEvent) {
		event?.stopPropagation();
		showRepairDropdown = !showRepairDropdown;
	}

	function handleRepairOptionClick(event: MouseEvent, value: boolean | null) {
		event.stopPropagation();
		updateRepairStatus(value);
		showRepairDropdown = false;
	}
</script>

{#if selectedGroup}
	<div
		class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-10"
		onclick={onClose}
	>
		<div
			class="w-full max-w-7xl rounded-xl bg-white p-6 text-left shadow-2xl"
			onclick={stopPropagation}
		>
			<div class="flex items-start justify-between gap-4">
				<div class="flex w-full flex-row items-center gap-2">
					<h2 class="text-2xl font-medium text-stone-900">
						{selectedGroup.name}
					</h2>
					<span class="h-1 w-1 rounded-full bg-stone-900" />
					<p class="text-2xl font-medium text-stone-500">
						{selectedGroup.room ?? 'Unassigned room'}
					</p>

					{#if anyDamaged}
						<div class="relative">
							<button
								type="button"
								class="text-md flex flex-row items-center gap-2 rounded-full border border-stone-200 px-2 py-1 text-stone-500 transition hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:outline-none"
								onclick={toggleRepairDropdown}
							>
								<span class={`h-2 w-2 rounded-full ${repairDotColor(selectedGroup.in_repair)}`}
								></span>
								<span class="text-md text-stone-800">
									{repairLabel(selectedGroup.in_repair)}
								</span>
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.8"
									stroke-linecap="round"
									stroke-linejoin="round"
									class={`h-4 w-4 text-stone-500 transition-transform ${
										showRepairDropdown ? 'rotate-180' : ''
									}`}
									aria-hidden="true"
								>
									<path d="M6 9l6 6 6-6" />
								</svg>
							</button>

							{#if showRepairDropdown}
								<div
									class="text-md absolute right-0 z-10 mt-2 w-40 rounded-md border border-stone-200 bg-white py-1 shadow-lg"
								>
									{#each repairOptions as option}
										<button
											type="button"
											class={`flex w-full items-center justify-between px-3 py-1.5 text-left ${
												selectedGroup.in_repair === option.value
													? 'bg-stone-100 text-stone-900'
													: 'text-stone-700 hover:bg-stone-50'
											}`}
											onclick={(event) => handleRepairOptionClick(event, option.value)}
										>
											<span class="flex flex-row items-center gap-2">
												<span class={`h-2 w-2 rounded-full ${repairDotColor(option.value)}`}></span>
												{option.label}
											</span>
											{#if selectedGroup.in_repair === option.value}
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 20 20"
													fill="currentColor"
													class="h-3 w-3 text-stone-700"
												>
													<path
														fill-rule="evenodd"
														d="M16.704 5.29a1 1 0 0 1 .006 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4A1 1 0 0 1 4.71 9.29L8 12.586l7.296-7.296a1 1 0 0 1 1.408 0z"
														clip-rule="evenodd"
													/>
												</svg>
											{/if}
										</button>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>

				<button
					type="button"
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition hover:bg-stone-50"
					onclick={onClose}
					aria-label="Close modal"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 16 16"
						class="h-4 w-4"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="4" y1="4" x2="12" y2="12" />
						<line x1="12" y1="4" x2="4" y2="12" />
					</svg>
				</button>
			</div>

			<div class="mt-6 grid grid-cols-3 gap-4">
				{#each stages as stage}
					<div class="relative overflow-hidden rounded-2xl bg-black shadow-xl">
						<div class="relative aspect-4/3 w-full">
							{#if stage.image?.url}
								<img
									src={stage.image.url}
									alt={`${stage.label} · ${selectedGroup.name}`}
									class="h-full w-full object-cover"
									loading="lazy"
								/>
							{:else}
								<div
									class="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-800 via-stone-900 to-black text-[10px] font-medium tracking-widest text-stone-400 uppercase"
								>
									No photo yet
								</div>
							{/if}
							<div
								class="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-black via-black/60 to-transparent"
							></div>
							<div
								class="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-black via-black/60 to-transparent"
							></div>
						</div>

						<div class="pointer-events-none absolute inset-0 flex flex-col">
							<div
								class="flex w-full flex-row items-center justify-between px-4 pt-4 text-sm font-normal tracking-wide text-white"
							>
								{stage.label}
								{#if stage?.damaged}
									<div
										class="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs text-amber-500 backdrop-blur-xs"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="currentColor"
											class="bi bi-exclamation-triangle-fill h-3 w-3"
											viewBox="0 0 16 16"
										>
											<path
												d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"
											/>
										</svg>
										<span class="font-normal text-white">Damaged</span>
									</div>
								{/if}
							</div>

							<div class="mt-auto flex items-end justify-end px-4 pb-3">
								<span class="font-mono text-[11px] font-light text-stone-200/80">
									{formatTimestamp(stage.image) || ''}
								</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
