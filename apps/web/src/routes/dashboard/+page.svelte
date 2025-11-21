<script lang="ts">
	type Task = {
		id: string;
		title: string;
	};

	type Group = {
		id: string;
		name: string;
		expanded: boolean;
		items: Task[];
	};

	let groups = $state<Group[]>([
		{
			id: 'g1',
			name: 'Property 1',
			expanded: true,
			items: [
				{
					id: 't1',
					title: 'Unit 1'
				},
				{
					id: 't2',
					title: 'Unit 2'
				},
				{
					id: 't3',
					title: 'Unit 3'
				}
			]
		},
		{
			id: 'g2',
			name: 'Property 2',
			expanded: false,
			items: [
				{
					id: 't1',
					title: 'Unit 1'
				},
				{
					id: 't2',
					title: 'Unit 2'
				},
				{
					id: 't3',
					title: 'Unit 3'
				}
			]
		}
	]);

	function toggleGroup(i: number) {
		groups[i].expanded = !groups[i].expanded;
		// Svelte 5: reassign to trigger reactivity for nested change
		groups = [...groups];
	}
</script>

<div class="flex min-h-screen w-full flex-col bg-stone-50 p-20 font-sans">
	<h1 class="mb-10 text-4xl font-medium text-stone-900">Dashboard</h1>
	{#each groups as group, i (group.id)}
		<div class="mb-4">
			<div class="grid w-full grid-cols-[1fr_180px_180px_140px] text-left">
				<div class="flex items-center gap-2 font-medium text-stone-700">
					<button
						type="button"
						onclick={() => toggleGroup(i)}
						class="rounded p-1 transition hover:bg-stone-200"
					>
						<svg
							class={'h-4 w-4 transition-transform ' + (group.expanded ? 'rotate-90' : '')}
							viewBox="0 0 12 12"
							fill="currentColor"
						>
							<path d="M4 2l5 4-5 4z" />
						</svg>
					</button>
					<div class="flex items-center gap-1 rounded px-2 py-0.5 text-lg">
						<span class="relative inline-flex h-3 w-3 items-center justify-center">
							<span class="absolute h-full w-full rounded-full bg-emerald-300/40"></span>
							<span class="relative h-2 w-2 rounded-full bg-emerald-500"></span>
						</span>
						{group.name}
					</div>
				</div>
			</div>

			{#if group.expanded}
				{#each group.items as task (task.id)}
					<div
						class="grid grid-cols-[1fr_180px_180px_140px] gap-4 border-b border-stone-700/30 py-2 transition hover:bg-stone-200"
					>
						<div class="pl-2 text-stone-700">{task.title}</div>
					</div>
				{/each}
			{/if}
		</div>
	{/each}
</div>
