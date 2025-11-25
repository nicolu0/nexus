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
					class="flex h-5 w-5 items-center justify-center rounded-sm text-stone-400 transition hover:bg-stone-200 hover:text-stone-500"
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
					class="h-5 w-5 rounded-sm text-stone-400 transition hover:bg-stone-200 hover:text-stone-500"
					onclick={handleClose}
					aria-label="Collapse"
				>
					<svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
						<!-- Left chevron -->
						<path
							d="M6 6 L11 10 L6 14"
							stroke="currentColor"
							stroke-width="1"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
						<!-- Right chevron -->
						<path
							d="M10 6 L15 10 L10 14"
							stroke="currentColor"
							stroke-width="1"
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
