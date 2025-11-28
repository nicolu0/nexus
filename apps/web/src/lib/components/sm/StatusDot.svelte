<script lang="ts">
	let { stage = 'vacant', size = 'h-2 w-2' } = $props<{
		stage?: string;
		size?: string;
	}>();
	const color = $derived.by(() => {
		if (stage === 'Vacant') return 'bg-stone-500';
		if (stage === 'Move-in') return 'bg-blue-500';
		if (stage === 'Move-out') return 'bg-emerald-500';
		return 'bg-stone-500';
	});
</script>

<span class={`flex rounded-full ${size} ${color}`} aria-hidden="true"></span>
