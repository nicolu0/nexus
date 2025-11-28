<script lang="ts">
	export type GroupImageSlot = {
		label: string;
		imageUrl?: string | null;
	};

	type GroupImage = {
		id: string;
		url: string;
		created_at: string;
		phase: 'move_in' | 'move_out' | 'repair';
		notes?: string | null;
	};

	const defaultSlots: GroupImageSlot[] = [
		{ label: 'Move-in', imageUrl: '/demo_image.jpg' },
		{ label: 'Move-out', imageUrl: null },
		{ label: 'Repair', imageUrl: null }
	];

	const slotOrder = ['Move-in', 'Move-out', 'Repair'];

	function toTimestamp(createdAt: string | Date | null | undefined): string {
		if (!createdAt) return '';

		const d = new Date(createdAt);
		if (Number.isNaN(d.getTime())) return '';

		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		const yy = String(d.getFullYear()).slice(-2);
		const hh = String(d.getHours()).padStart(2, '0');
		const min = String(d.getMinutes()).padStart(2, '0');

		return `${mm}/${dd}/${yy} ${hh}:${min}`;
	}

	const {
		// new schema props
		name = 'Bed',
		room = 'Bedroom 1',
		movein = null,
		moveout = null,
		repair = null
	} = $props<{
		name?: string;
		room?: string;
		movein?: GroupImage | null;
		moveout?: GroupImage | null;
		repair?: GroupImage | null;
	}>();

	$inspect(movein);
	$inspect(moveout);
	$inspect(repair);
	// derived status label (text)
	const status = repair ? 'Repair' : moveout ? 'Move-out' : movein ? 'Move-in' : 'No photos';

	const allImages = $derived([movein, moveout, repair].filter(Boolean) as GroupImage[]);

	const latestImage = $derived<GroupImage | null>(
		allImages.length
			? allImages.reduce((curr, img) => (img.created_at > curr.created_at ? img : curr))
			: null
	);

	const timestamp = $derived(latestImage ? toTimestamp(latestImage.created_at) : '');

	const statusDotClass = $derived.by(() => {
		if (repair) return 'bg-red-500';
		if (moveout) return 'bg-emerald-500';
		if (movein) return 'bg-blue-500';
		return 'bg-stone-500';
	});
	// build slots from movein / moveout / repair
	const imageSlots: GroupImageSlot[] = [
		{ label: 'Move-in', imageUrl: movein?.url ?? null },
		{ label: 'Move-out', imageUrl: moveout?.url ?? null },
		{ label: 'Repair', imageUrl: repair?.url ?? null }
	];

	const normalizedSlots = slotOrder.map((label, index) => {
		const match =
			imageSlots.find((slot) => slot.label.toLowerCase() === label.toLowerCase()) ??
			imageSlots[index] ??
			defaultSlots[index];
		return { ...match, label };
	});

	const filledSlots = normalizedSlots.filter((slot) => Boolean(slot.imageUrl));
	const displaySlot =
		[...normalizedSlots].reverse().find((slot) => slot.imageUrl) ?? normalizedSlots[0];
	const stackDepth = filledSlots.length;
</script>

<div class="relative mx-auto w-full max-w-xl">
	{#if stackDepth >= 2}
		<div
			class="pointer-events-none absolute inset-x-3 -top-1 h-full rounded-2xl bg-neutral-600/40"
		></div>
	{/if}
	{#if stackDepth >= 3}
		<div
			class="pointer-events-none absolute inset-x-6 -top-2 h-full rounded-2xl bg-neutral-500/30"
		></div>
	{/if}

	<!-- main card -->
	<div class="relative overflow-hidden rounded-2xl bg-black shadow-xl">
		<div class="relative w-full">
			<div class="relative aspect-4/3 w-full">
				{#if displaySlot?.imageUrl}
					<img
						src={displaySlot.imageUrl}
						alt={`${displaySlot.label} · ${name}`}
						class="h-full w-full object-cover"
						loading="lazy"
					/>
				{:else}
					<div
						class="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-800 via-stone-900 to-black text-[10px] font-medium tracking-wide text-stone-400 uppercase"
					>
						No photos yet
					</div>
				{/if}
				<div
					class="pointer-events-none absolute inset-x-0 top-0 h-32
				       bg-linear-to-b from-black via-black/60 to-transparent"
				></div>
				<div
					class="pointer-events-none absolute inset-x-0 bottom-0 h-32
				       bg-linear-to-t from-black via-black/60 to-transparent"
				></div>
			</div>

			<div class="absolute inset-0 flex flex-col">
				<div class="flex items-center justify-between px-4 pt-4">
					<div class="flex items-center gap-1 text-xs text-white">
						<span class={`h-2 w-2 rounded-full ${statusDotClass}`}></span>
						<span class="font-normal text-white">{status}</span>
					</div>
				</div>

				<!-- bottom row: name · room + timestamp -->
				<div class="mt-auto flex items-end justify-between px-4 pb-4">
					<div class="text-xs font-normal text-white">
						{name}
						<span class="text-stone-100">·</span>
						<span class="text-stone-300">{room}</span>
					</div>

					<div class="flex flex-col items-end text-right text-[10px] font-light text-stone-200/80">
						<span class="font-mono text-xs font-light text-stone-200/80">{timestamp}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
