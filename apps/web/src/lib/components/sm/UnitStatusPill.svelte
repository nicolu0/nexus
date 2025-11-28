<script lang="ts">
	import StatusDot from './StatusDot.svelte';

	const { label } = $props<{
		label: string; // 'vacant' | 'movein' | 'moveout'
	}>();

	// const normalized = $derived(label.toLowerCase());

	// Tailwind color class based on status
</script>

<div class="flex flex-row items-center gap-2 rounded-full border border-stone-200 px-2 py-1 text-xs">
	<StatusDot stage={label} />
	{label}
	<slot />
</div>
