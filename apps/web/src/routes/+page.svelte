<script lang="ts">
	import nexusLogo from '$lib/assets/nexus.svg';
</script>

<div class="flex min-h-screen w-full bg-stone-50 font-sans">
	<!-- Simple Header -->
	<nav
		class="fixed top-4 right-0 left-0 z-50 mx-auto w-full max-w-7xl rounded-xl bg-stone-50/50 px-6 py-4 backdrop-blur-md transition-all duration-200"
	>
		<div class="container mx-auto flex items-center justify-between">
			<div class="flex items-center gap-2">
				<img src={nexusLogo} alt="Nexus logo" class="h-5 w-5" />
				<span class="font-semibold tracking-tight text-stone-700">NEXUS</span>
			</div>
			<div class="hidden items-center gap-8 text-sm font-medium text-stone-600 md:flex">
				<a href="#features" class="transition-colors hover:text-stone-900">Features</a>
				<a href="#how-it-works" class="transition-colors hover:text-stone-900">How it works</a>
				<a
					href="/signup"
					class="rounded-lg bg-stone-900 px-4 py-2 text-stone-50 transition-colors hover:bg-stone-800"
					>Sign up</a
				>
			</div>
		</div>
	</nav>

	<section class="flex w-full items-center overflow-hidden pb-20">
		<div class="relative z-10 container mx-auto flex flex-col items-center px-4">
			<div class="max-w-6xl">
				<h1 class="mb-6 text-5xl font-medium tracking-tight text-balance text-stone-900">
					Effortless <span class="font-bold text-stone-900">AB2801</span> Compliance for Property Managers
				</h1>
				<p class="mb-10 max-w-2xl text-xl text-balance text-stone-600">
					AI-powered photo organization, damage detection, and security deduction reports. Protect
					your properties and your business.
				</p>
				<div class="mb-20 flex gap-4">
					<a
						href="/signup"
						class="rounded-lg bg-stone-900 px-8 py-3 font-medium text-stone-50 transition-colors hover:bg-stone-800"
					>
						Start Free Trial
					</a>
				</div>
			</div>
		</div>
	</section>
</div>
