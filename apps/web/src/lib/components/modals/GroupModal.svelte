<script lang="ts">
	type GroupImage = {
		id: string;
		url: string;
		created_at: string;
		notes?: string | null;
		phase: 'move_in' | 'move_out' | 'repair';
	};

	type StageKey = 'movein' | 'moveout' | 'repair';

	type GroupDetail = {
		id: string;
		name: string;
		room?: string | null;
		description?: string | null;
	} & Record<StageKey, GroupImage | null>;

	const { selectedGroup = null, onClose = () => {} } = $props<{
		selectedGroup?: GroupDetail | null;
		onClose?: () => void;
	}>();

	const stageLabels: Record<StageKey, string> = {
		movein: 'Move-in',
		moveout: 'Move-out',
		repair: 'Repair'
	};

	const stages = $derived(
		(['movein', 'moveout', 'repair'] as StageKey[]).map((key) => ({
			key,
			label: stageLabels[key],
			image: selectedGroup ? selectedGroup[key] : null
		}))
	);

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
</script>

{#if selectedGroup}
	<div
		class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-10"
		onclick={onClose}
	>
		<div
			class="w-full max-w-5xl rounded-2xl bg-white p-6 text-left shadow-2xl"
			onclick={stopPropagation}
		>
			<div class="flex items-start justify-between gap-4">
				<div class="flex flex-row items-center gap-2">
					<h2 class="text-2xl font-medium text-stone-900">
						{selectedGroup.name}
					</h2>
					<span class="h-1 w-1 rounded-full bg-stone-900" />
					<p class="text-2xl font-medium text-stone-500">
						{selectedGroup.room ?? 'Unassigned room'}
					</p>
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
							<div class="px-4 pt-4 text-xs font-normal tracking-wide text-white">
								{stage.label}
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
