<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/nexus_dark.svg';

	let { children } = $props();
</script>

<svelte:head>
	<title>Nexus</title>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
