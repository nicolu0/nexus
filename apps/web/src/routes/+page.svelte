<script lang="ts">
	import AlertPin from '$lib/components/landing/AlertPin.svelte';
	import TopoMap from '$lib/components/landing/TopoMap.svelte';
	import nexusLogo from '$lib/assets/nexus.svg';
	import { scale, fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import supabase from '$lib/supabaseClient';

	let showAuthModal = $state(false);
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	function openModal() {
		showAuthModal = true;
	}

	function closeModal() {
		showAuthModal = false;
		email = '';
		password = '';
		loading = false;
		errorMessage = '';
		successMessage = '';
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) closeModal();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') closeModal();
	}

	async function submitEmail(e: SubmitEvent) {
		e.preventDefault();
		if (loading) return;
		errorMessage = '';
		successMessage = '';

		if (!email || !password) {
			errorMessage = 'Email and password are required.';
			return;
		}

		loading = true;

		try {
			const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
				email,
				password
			});

			if (!signInError) {
				const userEmail = signInData.user?.email ?? email;
				successMessage = `Signed in as ${userEmail}. Redirecting...`;
				closeModal();
				await goto('/dashboard');
				return;
			}

			const { error: signUpError } = await supabase.auth.signUp({ email, password });

			if (signUpError) {
				if (/already registered/i.test(signUpError.message)) {
					throw new Error('Incorrect password for this email.');
				}
				throw signUpError;
			}

			successMessage = 'Account created! Check your inbox to verify your email.';
		} catch (err) {
			errorMessage =
				err instanceof Error ? err.message : 'Unable to sign up right now. Please try again later.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="flex min-h-screen w-full flex-col bg-stone-50 pt-10 font-sans text-stone-900">
	<!-- Header -->
	<nav
		class="fixed top-6 right-0 left-0 z-50 mx-auto w-full max-w-7xl rounded-xl border border-stone-200/50 bg-stone-50/60 px-4 py-2 shadow-sm backdrop-blur-md transition-all duration-200"
	>
		<div class="container mx-auto flex items-center justify-between">
			<div class="flex items-center gap-0.5">
				<img src={nexusLogo} alt="Nexus logo" class="h-8 w-8" />
				<span class="text-lg font-medium tracking-tight text-stone-700">Nexus</span>
			</div>
			<div class="hidden items-center gap-8 text-sm font-medium text-stone-600 md:flex">
				<a href="#features" class="transition-colors hover:text-stone-900">Features</a>
				<a href="#how-it-works" class="transition-colors hover:text-stone-900">How it works</a>
				<a href="#pricing" class="transition-colors hover:text-stone-900">Pricing</a>
				<button
					type="button"
					onclick={openModal}
					class="rounded-lg bg-stone-800 px-4 py-2 text-stone-50 transition hover:bg-stone-900"
				>
					Sign up
				</button>
			</div>
		</div>
	</nav>

	<!-- Hero -->
	<section class="relative flex min-h-screen w-full items-center overflow-hidden pb-20">
		<TopoMap />

		<!-- bottom fade-out (starts near the bottom now because hero is taller) -->
		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-64
         bg-gradient-to-b from-transparent via-stone-50/80 to-stone-50"
			aria-hidden="true"
		></div>

		<!-- pins overlay -->
		<div class="pointer-events-none absolute inset-0 z-10 mx-auto max-w-7xl">
			<div class="pointer-events-auto relative h-full w-full">
				<AlertPin top="22%" left="14%" delay={600} severity="high" message="Flood in Basement" />
				<AlertPin top="32%" left="95%" delay={1000} severity="medium" message="Broken Toilet" />
				<AlertPin top="58%" left="85%" delay={1400} severity="low" message="Photos Uploaded" />
			</div>
		</div>

		<div class="relative z-10 container mx-auto flex flex-col items-center px-4">
			<div class="max-w-6xl">
				<h1
					class="mb-6 text-6xl font-medium tracking-tight text-balance text-stone-800 md:text-7xl"
				>
					Effortless <span class="font-bold text-stone-800">AB2801</span> Compliance for Property Managers
				</h1>
				<p class="mb-10 max-w-2xl text-lg text-balance text-stone-600 md:text-xl">
					AI-powered photo organization, damage detection, and security deduction reports. Protect
					your properties and your business.
				</p>
				<div class="flex flex-col gap-3 sm:flex-row">
					<button
						type="button"
						onclick={openModal}
						class="rounded-lg bg-stone-800 px-8 py-3 font-medium text-stone-50 transition-colors hover:bg-stone-900"
					>
						Add your first unit
					</button>
					<button
						type="button"
						onclick={() => goto('#how-it-works')}
						class="rounded-lg border border-stone-200 bg-white px-8 py-3 font-medium text-stone-800 transition hover:bg-stone-100"
					>
						See how it works
					</button>
				</div>
			</div>
		</div>
		<!-- Trusted by -->
		<div class="absolute inset-x-0 bottom-45 z-20">
			<div class="mx-auto flex w-full flex-col items-center px-4">
				<div class="text-sm font-medium text-stone-500">
					Trusted by forward-thinking property managers
				</div>

				<div class="mt-6 flex flex-wrap items-center justify-center gap-10 opacity-80">
					<div class="flex h-8 items-center justify-center rounded-md text-4xl font-semibold">
						0,000+ Properties
					</div>
					<div class="flex h-8 items-center justify-center rounded-md text-4xl font-semibold">
						0,000+ Units
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Features -->
	<section id="features" class="w-full py-36">
		<div class="container mx-auto max-w-7xl px-4">
			<div class="mb-10 flex items-end justify-between gap-6">
				<div class="flex w-full flex-col items-center">
					<h2 class="text-3xl font-semibold tracking-tight text-stone-900 md:text-4xl">
						Built for AB2801, not generic storage
					</h2>
					<p class="mt-2 max-w-3xl text-stone-600">
						Every photo, tag, and report maps to what California now requires for move-in and
						move-out.
					</p>
				</div>
			</div>

			<div class="grid gap-4 md:grid-cols-3">
				<div class="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
					<div class="text-md font-semibold text-stone-900">Guided Move-In / Move-Out Capture</div>
					<p class="mt-2 text-sm text-stone-600">
						Room checklist, section-level camera, and phase tagging (move-in, move-out before,
						move-out after).
					</p>
				</div>

				<div class="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
					<div class="text-md font-semibold text-stone-900">Auto-organized Evidence</div>
					<p class="mt-2 text-sm text-stone-600">
						Photos are timestamped and stored by property → unit → section with before/after pairs.
					</p>
				</div>

				<div class="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
					<div class="text-md font-semibold text-stone-900">Damage Detection + Deductions</div>
					<p class="mt-2 text-sm text-stone-600">
						AI highlights deltas, you approve tags, and Nexus generates a compliant security
						deduction report.
					</p>
				</div>
			</div>

			<div class="mt-4 grid gap-4 md:grid-cols-2">
				<div class="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
					<div class="text-sm font-semibold text-stone-900">Portfolio Dashboard</div>
					<p class="mt-2 text-sm text-stone-600">
						Properties list with unit-level status, fast filters, and sidepanel review.
					</p>
				</div>

				<div class="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
					<div class="text-sm font-semibold text-stone-900">Web + Mobile Sync</div>
					<p class="mt-2 text-sm text-stone-600">
						Capture on site, review in the office. Everything stays in sync automatically.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- How it works -->
	<section id="how-it-works" class="w-full bg-white py-20">
		<div class="container mx-auto max-w-7xl px-4">
			<div class="mb-10">
				<h2 class="text-3xl font-semibold tracking-tight text-stone-900 md:text-4xl">
					How it works
				</h2>
				<p class="mt-2 max-w-2xl text-stone-600">
					Follow a repeatable workflow. No chasing photos. No missing sections.
				</p>
			</div>

			<div class="grid gap-6 md:grid-cols-3">
				<div class="rounded-2xl border border-stone-200 p-6">
					<div class="text-xs font-semibold tracking-wide text-stone-500 uppercase">Step 1</div>
					<div class="mt-2 text-lg font-semibold">Capture with the mobile checklist</div>
					<ul class="mt-3 space-y-2 text-sm text-stone-600">
						<li>Pick a unit + tenancy.</li>
						<li>Room/section checklist prevents gaps.</li>
						<li>Retake, preview, and mark sections done.</li>
					</ul>
				</div>

				<div class="rounded-2xl border border-stone-200 p-6">
					<div class="text-xs font-semibold tracking-wide text-stone-500 uppercase">Step 2</div>
					<div class="mt-2 text-lg font-semibold">Auto-organize and compare</div>
					<ul class="mt-3 space-y-2 text-sm text-stone-600">
						<li>Photos stored by unit + section + phase.</li>
						<li>Before/after paired automatically.</li>
						<li>Damage deltas surfaced for review.</li>
					</ul>
				</div>

				<div class="rounded-2xl border border-stone-200 p-6">
					<div class="text-xs font-semibold tracking-wide text-stone-500 uppercase">Step 3</div>
					<div class="mt-2 text-lg font-semibold">Generate compliant deductions</div>
					<ul class="mt-3 space-y-2 text-sm text-stone-600">
						<li>Select damages + costs.</li>
						<li>One-click AB2801 report export.</li>
						<li>Store and share with tenants.</li>
					</ul>
				</div>
			</div>

			<div class="mt-10 grid gap-6 md:grid-cols-2">
				<div class="rounded-2xl border border-stone-200 bg-stone-50 p-6">
					<div class="text-sm font-semibold text-stone-900">Mobile App</div>
					<p class="mt-2 text-sm text-stone-600">Designed for on-site documentation.</p>
					<ul class="mt-3 space-y-2 text-sm text-stone-700">
						<li>Move-in flow: unit → sections → capture → progress bar.</li>
						<li>Move-out flow: before/after repair tagging.</li>
						<li>Each photo includes unit, section, phase, timestamp.</li>
					</ul>
				</div>

				<div class="rounded-2xl border border-stone-200 bg-stone-50 p-6">
					<div class="text-sm font-semibold text-stone-900">Web Dashboard</div>
					<p class="mt-2 text-sm text-stone-600">Built for review and reporting.</p>
					<ul class="mt-3 space-y-2 text-sm text-stone-700">
						<li>Property list with unit health indicators.</li>
						<li>Unit sidepanel with section tags.</li>
						<li>Before/after photos side-by-side.</li>
					</ul>
				</div>
			</div>
		</div>
	</section>

	<!-- Pricing / CTA -->
	<section id="pricing" class="w-full py-20">
		<div class="container mx-auto max-w-7xl px-4">
			<div class="grid items-center gap-8 md:grid-cols-2">
				<div>
					<h2 class="text-3xl font-semibold tracking-tight text-stone-900 md:text-4xl">
						Start free. Upgrade when you’re ready.
					</h2>
					<p class="mt-2 text-stone-600">Early access pricing is simple and month-to-month.</p>
					<ul class="mt-4 space-y-2 text-sm text-stone-700">
						<li>Unlimited properties and units.</li>
						<li>AB2801 report exports included.</li>
						<li>Email support and onboarding.</li>
					</ul>
				</div>

				<div class="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
					<div class="text-sm font-semibold text-stone-900">Early Access</div>
					<div class="mt-2 flex items-baseline gap-2">
						<div class="text-5xl font-semibold text-stone-900">$0</div>
						<div class="text-sm text-stone-500">to start</div>
					</div>
					<p class="mt-3 text-sm text-stone-600">
						Try Nexus on your next move-in or move-out. No card required.
					</p>
					<button
						type="button"
						onclick={openModal}
						class="mt-6 w-full rounded-xl bg-stone-800 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-900"
					>
						Start Free Trial
					</button>
					<p class="mt-3 text-center text-xs text-stone-500">
						Upgrade later for advanced AI and team features.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="w-full border-t border-stone-200 bg-white py-10">
		<div
			class="container mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 md:flex-row"
		>
			<div class="flex items-center gap-2 text-sm text-stone-600">
				<img src={nexusLogo} alt="Nexus logo" class="h-5 w-5" />
				<span>Nexus</span>
			</div>
			<div class="text-xs text-stone-400">
				© {new Date().getFullYear()} Nexus. All rights reserved.
			</div>
		</div>
	</footer>
</div>

{#if showAuthModal}
	<div
		in:fade={{ duration: 200 }}
		out:fade={{ duration: 100 }}
		class="fixed inset-0 z-[120] flex items-center justify-center bg-stone-50/80"
		role="dialog"
		aria-modal="true"
		aria-label="Sign up"
		tabindex="-1"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
	>
		<div
			in:scale={{ start: 0.9, duration: 200 }}
			class="w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-6 text-stone-800 shadow-[0_12px_32px_rgba(15,15,15,0.12)]"
		>
			<div class="flex items-center justify-between">
				<div class="text-sm font-semibold tracking-tight text-stone-900">
					Create your Nexus account
				</div>
				<button
					type="button"
					class="rounded-full p-1 text-stone-500 hover:text-stone-800"
					onclick={closeModal}
					aria-label="Close sign up"
				>
					<svg
						viewBox="0 0 24 24"
						class="h-4 w-4"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M6 6l12 12M6 18L18 6" stroke-linecap="round" />
					</svg>
				</button>
			</div>

			<p class="mt-2 text-xs text-stone-500">
				Enter email and password to sign in or create your account in seconds.
			</p>

			<form class="mt-5 space-y-4" onsubmit={submitEmail}>
				<label class="block text-xs font-semibold tracking-wide text-stone-500 uppercase">
					Email
					<input
						type="email"
						required
						class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm transition outline-none placeholder:text-stone-400 focus:border-stone-400"
						placeholder="you@example.com"
						bind:value={email}
						autocomplete="email"
					/>
				</label>
				<label class="block text-xs font-semibold tracking-wide text-stone-500 uppercase">
					Password
					<input
						type="password"
						required
						minlength="8"
						class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm transition outline-none placeholder:text-stone-400 focus:border-stone-400"
						placeholder="••••••••"
						bind:value={password}
						autocomplete="new-password"
					/>
				</label>
				{#if errorMessage}
					<p class="text-sm text-rose-600" aria-live="assertive">{errorMessage}</p>
				{/if}
				{#if successMessage}
					<p class="text-sm text-emerald-600" aria-live="polite">{successMessage}</p>
				{/if}
				<button
					type="submit"
					class="w-full rounded-xl bg-stone-900 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
					disabled={loading}
				>
					{#if loading}
						Creating account...
					{:else}
						Create account
					{/if}
				</button>
			</form>
		</div>
	</div>
{/if}
