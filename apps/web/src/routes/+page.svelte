<script lang="ts">
	import AlertPin from '$lib/components/AlertPin.svelte';
	import TopoMap from '$lib/components/TopoMap.svelte';
	import nexusLogo from '$lib/assets/nexus.svg';
	import { fly, scale, fade } from 'svelte/transition';
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
			// Try signing in first
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

			// If sign in failed because the user doesn't exist, fall back to sign up.
			const { error: signUpError } = await supabase.auth.signUp({
				email,
				password
			});

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

<div class="flex min-h-screen w-full bg-stone-50 font-sans">
	<!-- Simple Header -->
	<nav
		class="fixed top-4 right-0 left-0 z-50 mx-auto w-full max-w-7xl rounded-xl border border-stone-200/50 bg-stone-50/50 px-4 py-2 shadow-sm backdrop-blur-md transition-all duration-200"
	>
		<div class="container mx-auto flex items-center justify-between">
			<div class="flex items-center gap-0.5">
				<img src={nexusLogo} alt="Nexus logo" class="h-8 w-8" />
				<span class="text-lg font-medium tracking-tight text-stone-700">Nexus</span>
			</div>
			<div class="hidden items-center gap-8 text-sm font-medium text-stone-600 md:flex">
				<a href="#features" class="transition-colors hover:text-stone-900">Features</a>
				<a href="#how-it-works" class="transition-colors hover:text-stone-900">How it works</a>
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

	<section class="relative flex w-full items-center overflow-hidden pb-20">
		<TopoMap />
		<div class="pointer-events-none absolute inset-0 z-10 mx-auto max-w-7xl">
			<div class="pointer-events-auto relative h-full w-full">
				<AlertPin top="22%" left="14%" delay={600} severity="high" message="Flood in Basement" />
				<AlertPin top="52%" left="90%" delay={1600} severity="medium" message="Broken Toilet" />
				<AlertPin top="68%" left="68%" delay={2600} severity="low" message="Photos Uploaded" />
			</div>
		</div>

		<div class="relative z-10 container mx-auto flex flex-col items-center px-4">
			<div class="max-w-6xl">
				<h1 class="mb-6 text-7xl font-medium tracking-tight text-balance text-stone-800">
					Effortless <span class="font-bold text-stone-800">AB2801</span> Compliance for Property Managers
				</h1>
				<p class="mb-10 max-w-2xl text-xl text-balance text-stone-600">
					AI-powered photo organization, damage detection, and security deduction reports. Protect
					your properties and your business.
				</p>
				<div class="flex gap-4">
					<button
						type="button"
						onclick={openModal}
						class="rounded-lg bg-stone-800 px-8 py-3 font-medium text-stone-50 transition-colors hover:bg-stone-900"
					>
						Start Free Trial
					</button>
				</div>
			</div>
		</div>
	</section>
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
