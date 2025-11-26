<script lang="ts">
	import { goto } from '$app/navigation';
	import nexusLogo from '$lib/assets/nexus.svg';
</script>

<div
	class="sticky top-0 z-20 flex w-full items-center justify-between border-b border-stone-200 bg-stone-50 px-3 py-3"
>
	<div class="flex items-center gap-1">
		<img src={nexusLogo} alt="Nexus logo" class="h-6 w-6" />
		<span class="text-lg font-semibold tracking-tight text-stone-700">Nexus</span>
	</div>
	<div class="flex items-center gap-4">
		<button
			type="button"
			class="flex items-center rounded-full bg-stone-200 p-2 transition hover:border-stone-300 focus-visible:outline-none"
			aria-label="Sign out"
			onclick={() => {
				goto('/');
			}}
		>
			<span class="font-mono tracking-tighter text-stone-500">
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="currentColor"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					shape-rendering="geometricPrecision"
					class="h-4 w-4 transition-colors duration-200"
				>
					<path d="M20 21.5v-2.5a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2.5h16" />
					<circle cx="12" cy="7" r="4" />
				</svg>
			</span>
		</button>
	</div>
</div>
