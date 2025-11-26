<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { Property, UnitSummary } from '$lib/types/dashboard';

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
	</div>
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
