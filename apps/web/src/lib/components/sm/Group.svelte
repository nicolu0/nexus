<script lang="ts">
	export type GroupImageSlot = {
		label: string;
		damaged: boolean;
		imageUrl?: string | null;
	};

	type GroupImage = {
		id: string;
		url: string;
		created_at: string;
		phase: 'move_in' | 'move_out' | 'repair';
		notes?: string | null;
		damaged: boolean;
	};

	const defaultSlots: GroupImageSlot[] = [
		{ label: 'Move-in', damaged: false, imageUrl: '/demo_image.jpg' },
		{ label: 'Move-out', damaged: false, imageUrl: null },
		{ label: 'Repair', damaged: false, imageUrl: null }
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
		name = 'Bed',
		room = 'Bedroom 1',
		in_repair = null,
		movein = null,
		moveout = null,
		repair = null
	} = $props<{
		name?: string;
		room?: string;
		in_repair?: boolean | null;
		movein?: GroupImage | null;
		moveout?: GroupImage | null;
		repair?: GroupImage | null;
	}>();

	const allImages = $derived([movein, moveout, repair].filter(Boolean) as GroupImage[]);

	const latestImage = $derived<GroupImage | null>(
		allImages.length
			? allImages.reduce((curr, img) => (img.created_at > curr.created_at ? img : curr))
			: null
	);

	const timestamp = $derived(latestImage ? toTimestamp(latestImage.created_at) : '');

	// Build slots from movein / moveout / repair
	const imageSlots: GroupImageSlot[] = [
		{ label: 'Move-in', damaged: !!movein?.damaged, imageUrl: movein?.url ?? null },
		{ label: 'Move-out', damaged: !!moveout?.damaged, imageUrl: moveout?.url ?? null },
		{ label: 'Repair', damaged: !!repair?.damaged, imageUrl: repair?.url ?? null }
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

	const hasAnyPhotos = $derived(!!(movein || moveout || repair));
	const anyDamaged = $derived(normalizedSlots.some((slot) => slot.damaged));

	// Status has two modes:
	// 1) No damage anywhere -> phase-based
	// 2) Any damaged photo -> in_repair-based
	const status = $derived.by(() => {
		if (!anyDamaged) {
			if (!hasAnyPhotos) return 'No photos';
			if (repair) return 'Repair';
			if (moveout) return 'Move-out';
			if (movein) return 'Move-in';
			return 'No photos';
		}

		// Damaged path → in_repair tri-state
		if (in_repair === null || in_repair === undefined) return 'Needs Repair';
		if (in_repair === false) return 'In Repair';
		return 'Repaired';
	});

	const statusDotClass = $derived.by(() => {
		if (!anyDamaged) {
			if (!hasAnyPhotos) return 'bg-stone-500';
			if (repair) return 'bg-red-500';
			if (moveout) return 'bg-emerald-500';
			if (movein) return 'bg-blue-500';
			return 'bg-stone-500';
		}

		// Damaged path → in_repair colors
		if (in_repair === null || in_repair === undefined) return 'bg-red-500'; // Needs Repair
		if (in_repair === false) return 'bg-amber-500'; // In Repair
		return 'bg-emerald-500'; // Repaired
	});
</script>

<div class="relative mx-auto w-full max-w-xl">
	{#if stackDepth >= 2}
		<div
			class="pointer-events-none absolute inset-x-3 -top-1 h-full rounded-lg bg-neutral-900/40"
		></div>
	{/if}
	{#if stackDepth >= 3}
		<div
			class="pointer-events-none absolute inset-x-6 -top-2 h-full rounded-lg bg-neutral-700/30"
		></div>
	{/if}

	<div class="relative overflow-hidden rounded-lg bg-black">
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
					class="pointer-events-none absolute inset-x-0 top-0 h-14
				       bg-linear-to-b from-black/70 via-black/50 to-transparent"
				></div>
				<div
					class="pointer-events-none absolute inset-x-0 bottom-0 h-10
				       bg-linear-to-t from-black/70 via-black/50 to-transparent"
				></div>
			</div>

			<div class="absolute inset-0 flex flex-col">
				<div class="flex items-center justify-between px-2 pt-2">
					<div class="flex items-center gap-1 text-sm text-white">
						<span class={`h-2 w-2 rounded-full ${statusDotClass}`}></span>
						<span class="font-normal text-white">{status}</span>
					</div>

					{#if displaySlot?.damaged && in_repair !== true}
						<div
							class="flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-xs text-amber-500 backdrop-blur-xs"
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

				<div class="mt-auto flex items-end justify-between px-2 pb-2">
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
