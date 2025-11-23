<script lang="ts">
	import StatusDot from '$lib/components/sm/StatusDot.svelte';

	const noop = () => {};

	let { onAddProperty = noop } = $props<{
		onAddProperty?: () => void;
	}>();
</script>

<div class="flex w-full items-center justify-between">
	<div class="flex flex-row gap-2">
		<input
			class="w-70 appearance-none rounded-md border border-stone-200 bg-white p-2 text-xs text-stone-900 ring-0
					outline-none placeholder:text-stone-400
					focus:border-stone-300 focus:ring-1 focus:ring-stone-300 focus:ring-offset-0
					focus-visible:ring-1 focus-visible:ring-stone-300 focus-visible:outline-none"
			placeholder="All Properties..."
		/>

		<input
			class="w-70 appearance-none rounded-md border border-stone-200 bg-white p-2 text-xs text-stone-900 ring-0
					outline-none placeholder:text-stone-400
					focus:border-stone-300 focus:ring-1 focus:ring-stone-300 focus:ring-offset-0
					focus-visible:ring-1 focus-visible:ring-stone-300 focus-visible:outline-none"
			placeholder="All Units..."
		/>

		<button
			type="button"
			class="flex flex-row items-center gap-1 rounded-md border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
			onclick={onAddProperty}
		>
			<StatusDot />
			Status
		</button>
	</div>

	<button
		type="button"
		class="rounded-md border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
		onclick={onAddProperty}
	>
		+ Add property
	</button>
</div>
