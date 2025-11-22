<!-- src/lib/components/AlertPin.svelte -->
<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import nexusLogo from '$lib/assets/nexus.svg';

	type Severity = 'low' | 'medium' | 'high';

	const {
		top = '50%',
		left = '50%',
		delay = 0,
		severity = 'low' as Severity,
		title = '',
		message = ''
	} = $props<{
		top?: string;
		left?: string;
		delay?: number;
		severity?: Severity;
		title?: string;
		message?: string;
	}>();

	let show = $state(false);

	const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
	const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

	const parsePercent = (v: string) => {
		const n = parseFloat(v.replace('%', ''));
		return Number.isFinite(n) ? n : 50;
	};

	// Derived percentages from props
	const topPct = $derived(parsePercent(top));
	const leftPct = $derived(parsePercent(left));

	// Softer depth mapping (less dramatic)
	const depthT = $derived(clamp((topPct - 35) / 65, 0, 1));

	// Primary depth scale (narrow band)
	const baseScale = $derived.by(() => {
		const nearScale = 1.05;
		const farScale = 0.85;
		let s = lerp(farScale, nearScale, depthT);

		const sideT = clamp(Math.abs(leftPct - 50) / 50, 0, 1);
		s *= lerp(1.0, 0.97, sideT);

		return s;
	});

	const dotColor = $derived(
		severity === 'high' ? 'bg-rose-500' : severity === 'medium' ? 'bg-amber-400' : 'bg-emerald-500'
	);

	// Pop-in after delay
	$effect(() => {
		show = false;
		const t = setTimeout(() => (show = true), delay);
		return () => clearTimeout(t);
	});
</script>

<div
	class="pointer-events-auto absolute"
	style={`top:${top}; left:${left}; transform: translate(-50%, -100%);`}
>
	<div class="relative">
		{#if show}
			<!-- oval ground shadow scales with depth -->
			<div
				class="absolute top-full left-1/2 mt-1 rounded-full bg-black/80 blur-xs"
				style={`
					width: ${10 * baseScale}px;
					height: ${3 * baseScale}px;
					transform: translateX(-50%) scaleX(1.8) scaleY(0.9);
					opacity: ${lerp(0.35, 0.65, depthT)};
				`}
				in:fade={{ duration: 200 }}
			/>
		{/if}

		<!-- pin (brand mark) -->
		<img
			src={nexusLogo}
			alt=""
			aria-hidden="true"
			style={`
				transform: translateY(${show ? 0 : 12}px) scale(${show ? baseScale : 0});
				opacity: ${show ? 0.9 : 0};
				transition: transform 100ms ease-out, opacity 100ms ease-out;
				width: ${32 * baseScale}px;
				height: ${32 * baseScale}px;
			`}
		/>
	</div>

	{#if show && (title || message)}
		<!-- centered pill popup -->
		<div
			class="pointer-events-none absolute -top-8 left-1/2
		       inline-flex origin-bottom -translate-x-1/2
		       items-center gap-2 rounded-full border
		       border-stone-200 bg-stone-50 px-2 py-1
		       whitespace-nowrap shadow-sm"
			in:scale={{ start: 0.9, duration: 220, delay: 200 }}
		>
			<div class={`h-2 w-2 rounded-full ${dotColor}`} />
			<div class="text-[10px] font-medium tracking-tight text-stone-900">
				{message}
			</div>
		</div>
	{/if}
</div>
