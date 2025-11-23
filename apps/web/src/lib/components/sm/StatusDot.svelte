<script lang="ts">
	let { color = 'bg-red-400', size = 'h-2 w-2' } = $props<{
		color?: string;
		size?: string;
	}>();
</script>

<span class={`flex rounded-full ${size} ${color}`} aria-hidden="true"></span>
