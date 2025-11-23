<script lang="ts">
	import { fly } from 'svelte/transition';
	import PhotoTriplet from '$lib/components/sm/PhotoTriplet.svelte';
	import type { Building, Section } from '$lib/types/dashboard';

	const noop = () => {};

	let {
		selectedUnit = null,
		selectedBuilding = null,
		sections = [],
		onClose = noop
	} = $props<{
		selectedUnit?: string | null;
		selectedBuilding?: Building | null;
		sections?: Section[];
		onClose?: () => void;
	}>();

	const shortAddr = (addr: string, n = 18) => (addr.length > n ? addr.slice(0, n) + '…' : addr);

	const handleClose = () => {
		onClose();
	};
</script>

{#if selectedUnit}
	<div
		class="absolute top-0 right-0 z-20 h-full w-full overflow-y-auto border-l border-stone-200 bg-stone-50 px-8 py-8 text-lg font-semibold text-stone-700 md:w-1/2"
		transition:fly={{ duration: 200, x: 10 }}
	>
		<div class="flex w-full items-center justify-between text-sm font-medium text-stone-400">
			<button class="text-xs text-stone-400 hover:text-stone-900" onclick={handleClose}>
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
					<PhotoTriplet photos={section.photos} label={section.label} />
				</section>
			{/each}
		</div>
	</div>
{/if}
