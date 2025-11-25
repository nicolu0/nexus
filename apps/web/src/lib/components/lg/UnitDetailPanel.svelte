<script lang="ts">
	import { fly } from 'svelte/transition';
	import PhotoTriplet from '$lib/components/sm/PhotoTriplet.svelte';
	import type { Property, Section } from '$lib/types/dashboard';

	const noop = () => {};

	let {
		selectedUnit = null,
		selectedProperty = null,
		sections = [],
		onClose = noop
	} = $props<{
		selectedUnit?: string | null;
		selectedProperty?: Property | null;
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
		class="absolute top-0 right-0 z-20 h-full w-1/2 overflow-y-auto border-l border-stone-200 bg-stone-50 text-lg font-semibold text-stone-700"
		transition:fly={{ duration: 200, x: 10 }}
	>
		<div class="flex w-full items-center justify-between p-4 text-sm font-medium text-stone-400">
			<button
				class="text-xs text-stone-400 hover:text-stone-900"
				onclick={handleClose}
				aria-label="Collapse"
			>
				<svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
					<!-- Left chevron -->
					<path
						d="M6 6 L11 10 L6 14"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<!-- Right chevron -->
					<path
						d="M10 6 L15 10 L10 14"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>

			<div transition:fly|global={{ duration: 200, x: 10 }}>
				{selectedUnit}/{selectedProperty ? shortAddr(selectedProperty.address) : ''}
			</div>
		</div>

		<div class="flex flex-col gap-8 px-8 pb-8">
			{#each sections as section (section.id)}
				<section class="flex flex-col">
					<h2 class="mb-2 text-xl font-semibold text-stone-900">
						{section.label}
					</h2>
					<PhotoTriplet photos={section.photos} label={section.label} />
				</section>
			{/each}
		</div>
	</div>
{/if}
