<script lang="ts">
	import { fly } from 'svelte/transition';
	import PhotoTriplet from '$lib/components/sm/PhotoTriplet.svelte';
	import type { Property, Section, UnitSummary } from '$lib/types/dashboard';

	const noop = () => {};

let {
	selectedUnit = null,
	selectedProperty = null,
	sections = [],
	onClose = noop,
	onAddPhoto = noop,
	isFullscreen = false,
	onToggleFullscreen = noop
} = $props<{
	selectedUnit?: UnitSummary | null;
	selectedProperty?: Property | null;
	sections?: Section[];
	onClose?: () => void;
	onAddPhoto?: (section: Section) => void;
	isFullscreen?: boolean;
	onToggleFullscreen?: () => void;
}>();

	const shortAddr = (addr: string, n = 18) => (addr.length > n ? addr.slice(0, n) + '…' : addr);

	const handleClose = () => {
		onClose();
	};
</script>

{#if selectedUnit}
	<div
		class={`absolute top-0 right-0 z-20 h-full overflow-y-auto border-l border-stone-200 bg-stone-50 text-lg font-semibold text-stone-700 ${
			isFullscreen ? 'left-0 w-full' : 'w-1/2'
		}`}
		transition:fly={{ duration: 200, x: 10 }}
	>
		<div class="flex w-full items-center justify-between p-3 text-xs font-medium text-stone-400">
			<div class="truncate">
				{selectedUnit ? selectedUnit.label : ''} /
				{selectedProperty ? shortAddr(selectedProperty.address) : ''}
			</div>
			<div class="flex items-center gap-1">
				<button
					class="rounded-sm p-1 text-stone-400 transition hover:bg-stone-200 hover:text-stone-500"
					onclick={onToggleFullscreen}
					aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
				>
					<svg
						class="h-4 w-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						{#if isFullscreen}
							<path d="M9 3H5a2 2 0 0 0-2 2v4" />
							<path d="M15 3h4a2 2 0 0 1 2 2v4" />
							<path d="M15 21h4a2 2 0 0 0 2-2v-4" />
							<path d="M9 21H5a2 2 0 0 1-2-2v-4" />
						{:else}
							<path d="M15 3h6v6" />
							<path d="M9 21H3v-6" />
							<path d="M21 9v6" />
							<path d="M3 9v6" />
						{/if}
					</svg>
				</button>
				<button
					class="rounded-sm p-1 text-stone-400 transition hover:bg-stone-200 hover:text-stone-500"
					onclick={handleClose}
					aria-label="Collapse"
				>
					<svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
						<!-- Left chevron -->
						<path
							d="M6 6 L11 10 L6 14"
							stroke="currentColor"
							stroke-width="1.2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
						<!-- Right chevron -->
						<path
							d="M10 6 L15 10 L10 14"
							stroke="currentColor"
							stroke-width="1.2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</button>
			</div>
		</div>

		<div class="flex flex-col gap-8 px-8 pt-4 pb-8">
			{#each sections as section (section.id)}
				<section class="flex flex-col">
					<div class="flex flex-row justify-between">
						<h2 class="mb-2 text-xl font-semibold text-stone-900">
							{section.label}
						</h2>
						<button
							class="h-6 rounded-md px-2 text-xs font-normal text-stone-600 hover:bg-stone-200"
							onclick={() => onAddPhoto(section)}>+ Add photo</button
						>
					</div>
					<PhotoTriplet photos={section.photos} label={section.label} />
				</section>
			{/each}
		</div>
	</div>
{/if}
