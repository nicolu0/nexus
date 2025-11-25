<script lang="ts">
	import type { Triplet } from '$lib/types/dashboard';

	const kinds = ['movein', 'moveout', 'repair'] as const;

	type PhotoKind = (typeof kinds)[number];

	let { photos, label } = $props<{
		photos: Triplet | null;
		label: string;
	}>();

	const getAlt = (kind: PhotoKind) => `${label} ${kind}`;
</script>

{#if photos}
	<div class="grid grid-cols-3 gap-3">
		{#each kinds as kind}
			<div class="flex flex-col gap-2">
				<div
					class="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-stone-200 bg-white"
				>
					{#if photos[kind]}
						<img src={photos[kind]} alt={getAlt(kind)} class="h-full w-full object-cover" />
					{:else}
						<div class="flex h-full w-full items-center justify-center text-xs text-stone-400">
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
	<div class="grid grid-cols-3 gap-3">
		{#each kinds as kind}
			<div class="flex flex-col gap-2">
				<div
					class="flex aspect-[4/3] w-full items-center justify-center rounded-md border border-dashed border-stone-300 bg-white text-xs text-stone-400"
				>
					No {kind} photos
				</div>
			</div>
		{/each}
	</div>
{/if}
