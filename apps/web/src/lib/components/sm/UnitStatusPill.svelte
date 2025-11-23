<script lang="ts">
	import StatusDot from './StatusDot.svelte';

	let { label, color = 'bg-red-400' } = $props<{
		label: string;
		color?: string;
	}>();
</script>

<div class="flex flex-row items-center gap-2 rounded-full border border-stone-200 p-1 px-2 text-xs">
	<StatusDot {color} />
	{label}
</div>
