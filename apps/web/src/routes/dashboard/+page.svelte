<script lang="ts">
	import PropertyList from '$lib/components/md/PropertyList.svelte';
	import Header from '$lib/components/md/Header.svelte';
	import PropertyToolbar from '$lib/components/md/PropertyToolbar.svelte';
	import UnitDetailPanel from '$lib/components/lg/UnitDetailPanel.svelte';
	import type { Property, PropertyStatusFilter, Section } from '$lib/types/dashboard';
	import supabase from '$lib/supabaseClient';
	import { onMount } from 'svelte';

	let selectedUnit = $state<string | null>(null);
	let selectedProperty = $state<Property | null>(null);

	let properties = $state<Property[]>([]);
	let filteredProperties = $state<Property[]>([]);
	let isLoading = $state(true);
	let propertyQuery = $state('');
	let unitQuery = $state('');
	let statusFilter = $state<PropertyStatusFilter>('all');

	const createPropertyForm = () => ({
		name: '',
		addressLine1: '',
		addressLine2: '',
		city: '',
		state: '',
		postalCode: ''
	});

	let showPropertyModal = $state(false);
	let propertyForm = $state(createPropertyForm());
	let propertySubmitting = $state(false);
	let propertyError = $state('');

	const createUnitForm = () => ({
		propertyId: null as string | null,
		unitNumber: '',
		floor: '',
		beds: '',
		baths: '',
		sqft: '',
		notes: ''
	});

	let showUnitModal = $state(false);
	let unitForm = $state(createUnitForm());
	let unitPropertyLabel = $state('');
	let unitSubmitting = $state(false);
	let unitError = $state('');

	const loadProperties = async () => {
		isLoading = true;
		try {
			const { data: propertyRows, error } = await supabase
				.from('properties')
				.select(`id, name, address_line1, address_line2, city, state, postal_code`)
				.order('created_at', { ascending: true });

			if (error) {
				throw error;
			}

			const hydrated = await Promise.all(
				(propertyRows ?? []).map(async (property, idx) => {
					const { data: unitRows, error: unitsError } = await supabase
						.from('units')
						.select(`id, unit_number`)
						.eq('property_id', property.id)
						.order('created_at', { ascending: true });

					if (unitsError) {
						console.error(`Unable to load units for property ${property.id}`, unitsError);
					}

					const cityState = [property.city, property.state].filter(Boolean).join(', ');
					const address = [
						property.address_line1,
						property.address_line2,
						cityState,
						property.postal_code
					]
						.filter((segment) => typeof segment === 'string' && segment.trim().length > 0)
						.join(', ');

					return {
						id: property.id,
						address: address || property.name || `Property ${idx + 1}`,
						units: (unitRows ?? []).map(
							(unit, unitIndex) => unit.unit_number ?? `Unit ${unitIndex + 1}`
						)
					};
				})
			);

			properties = hydrated;
		} catch (error) {
			console.error('Unable to load properties', error);
			properties = [];
		} finally {
			isLoading = false;
		}
	};

	onMount(() => {
		void loadProperties();
	});

	$effect(() => {
		const propertyTerm = propertyQuery.trim().toLowerCase();
		const unitTerm = unitQuery.trim().toLowerCase();
		const filter = statusFilter;

		filteredProperties = properties.filter((property) => {
			const addressText = (property.address ?? '').toLowerCase();
			const propertyMatches =
				propertyTerm.length === 0 || addressText.includes(propertyTerm);
			const unitMatches =
				unitTerm.length === 0 ||
				property.units.some((unit) => unit.toLowerCase().includes(unitTerm));
			const statusMatches =
				filter === 'all'
					? true
					: filter === 'withUnits'
						? property.units.length > 0
						: property.units.length === 0;
			return propertyMatches && unitMatches && statusMatches;
		});
	});

	const openPropertyModal = () => {
		propertyForm = createPropertyForm();
		propertyError = '';
		showPropertyModal = true;
	};

	const closePropertyModal = () => {
		if (propertySubmitting) return;
		showPropertyModal = false;
	};

	const submitProperty = async (event: SubmitEvent) => {
		event.preventDefault();
		if (propertySubmitting) return;

		const trimmedName = propertyForm.name.trim();
		const trimmedAddress = propertyForm.addressLine1.trim();

		if (!trimmedName && !trimmedAddress) {
			propertyError = 'Please enter a property name or street address.';
			return;
		}

		propertySubmitting = true;
		propertyError = '';

		const payload = {
			name: trimmedName || null,
			address_line1: trimmedAddress || null,
			address_line2: propertyForm.addressLine2.trim() || null,
			city: propertyForm.city.trim() || null,
			state: propertyForm.state.trim() || null,
			postal_code: propertyForm.postalCode.trim() || null
		};

		try {
			const { error } = await supabase.from('properties').insert(payload);
			if (error) {
				throw error;
			}
			showPropertyModal = false;
			await loadProperties();
		} catch (error) {
			propertyError = error instanceof Error ? error.message : 'Unable to create property.';
		} finally {
			propertySubmitting = false;
		}
	};

	const openUnitModal = (property: Property) => {
		unitForm = {
			...createUnitForm(),
			propertyId: property.id
		};
		unitPropertyLabel = property.address;
		unitError = '';
		showUnitModal = true;
	};

	const closeUnitModal = () => {
		if (unitSubmitting) return;
		showUnitModal = false;
	};

	const toNullableString = (value: string) => {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	};

	const toNullableNumber = (value: string | number | null | undefined) => {
		if (value === null || value === undefined) return null;
		const asString = typeof value === 'number' ? String(value) : value;
		const trimmed = asString.trim();
		if (trimmed.length === 0) return null;
		const parsed = Number(trimmed);
		return Number.isFinite(parsed) ? parsed : null;
	};

	const submitUnit = async (event: SubmitEvent) => {
		event.preventDefault();
		if (unitSubmitting) return;

		if (!unitForm.propertyId) {
			unitError = 'Select a property before adding a unit.';
			return;
		}

		if (!unitForm.unitNumber.trim()) {
			unitError = 'Unit number is required.';
			return;
		}
	};

	const openUnitModal = (property: Property) => {
		unitForm = {
			...createUnitForm(),
			propertyId: property.id
		};
		unitPropertyLabel = property.address;
		unitError = '';
		showUnitModal = true;
	};

		unitSubmitting = true;
		unitError = '';

		const payload = {
			property_id: unitForm.propertyId,
			unit_number: unitForm.unitNumber.trim(),
			floor: toNullableString(unitForm.floor),
			beds: toNullableNumber(unitForm.beds),
			baths: toNullableNumber(unitForm.baths),
			sqft: toNullableNumber(unitForm.sqft),
			notes: toNullableString(unitForm.notes)
		};

		try {
			const { error } = await supabase.from('units').insert(payload);
			if (error) {
				throw error;
			}
			showUnitModal = false;
			await loadProperties();
		} catch (error) {
			unitError = error instanceof Error ? error.message : 'Unable to create unit.';
		} finally {
			unitSubmitting = false;
		}
	};

	const inputClasses =
		'rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200';

	const sections = $state<Section[]>([
		{ id: 'kitchen', label: 'Kitchen', photos: null },
		{ id: 'bathroom', label: 'Bathroom', photos: null },
		{ id: 'bedroom', label: 'Bedroom', photos: null },
		{ id: 'living', label: 'Living', photos: null },
		{ id: 'other', label: 'Other', photos: null }
	]);

	const handleDashboardKeydown = (event: KeyboardEvent) => {
		if (event.key !== 'Escape') return;
		if (showUnitModal) {
			event.preventDefault();
			closeUnitModal();
			return;
		}
		if (showPropertyModal) {
			event.preventDefault();
			closePropertyModal();
		}
	};

	const handleModalPanelClick = (event: MouseEvent) => {
		event.stopPropagation();
	};
</script>

<svelte:window on:keydown={handleDashboardKeydown} />

<div class="flex h-dvh w-full flex-col bg-stone-50">
	<Header />

	<div class="relative flex min-h-0 flex-1 flex-row overflow-hidden">
		<div class="flex min-h-0 w-full flex-col gap-4 overflow-y-auto px-10 py-6">
			<PropertyToolbar
				propertyQuery={propertyQuery}
				unitQuery={unitQuery}
				statusFilter={statusFilter}
				onPropertyQueryChange={(value) => {
					propertyQuery = value;
				}}
				onUnitQueryChange={(value) => {
					unitQuery = value;
				}}
				onStatusChange={(value) => {
					statusFilter = value;
				}}
				onAddProperty={openPropertyModal}
			/>

			<PropertyList
				properties={filteredProperties}
				{isLoading}
				onAddUnit={openUnitModal}
				onSelectUnit={(property, unit) => {
					selectedUnit = unit;
					selectedProperty = property;
				}}
			/>
		</div>
		<UnitDetailPanel
			{sections}
			{selectedUnit}
			{selectedProperty}
			onClose={() => {
				selectedUnit = null;
				selectedProperty = null;
			}}
		/>
	</div>
</div>

{#if showPropertyModal}
	<div
		class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-10"
		onclick={closePropertyModal}
	>
		<div
			class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
			onclick={handleModalPanelClick}
		>
			<h2 class="text-xl font-semibold text-stone-900">Add property</h2>
			<p class="mt-1 text-sm text-stone-500">Enter a name and address for the new property.</p>

			{#if propertyError}
				<p class="mt-4 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-900">{propertyError}</p>
			{/if}

			<form class="mt-4 flex flex-col gap-4" onsubmit={submitProperty}>
				<label class="flex flex-col gap-1 text-xs font-medium text-stone-500">
					<span>Property name</span>
					<input
						type="text"
						class={inputClasses}
						placeholder="e.g. 502 E Healey St"
						bind:value={propertyForm.name}
					/>
				</label>

				<label class="flex flex-col gap-1 text-xs font-medium text-stone-500">
					<span>Address line 1</span>
					<input
						type="text"
						class={inputClasses}
						placeholder="Street address"
						bind:value={propertyForm.addressLine1}
					/>
				</label>

				<label class="flex flex-col gap-1 text-xs font-medium text-stone-500">
					<span>Address line 2</span>
					<input
						type="text"
						class={inputClasses}
						placeholder="Apartment, suite, etc."
						bind:value={propertyForm.addressLine2}
					/>
				</label>

				<div class="grid gap-4 sm:grid-cols-3">
					<label class="flex flex-col gap-1 text-xs font-medium text-stone-500">
						<span>City</span>
						<input type="text" class={inputClasses} bind:value={propertyForm.city} />
					</label>
					<label class="flex flex-col gap-1 text-xs font-medium text-stone-500">
						<span>State</span>
						<input type="text" class={inputClasses} bind:value={propertyForm.state} />
					</label>
					<label class="flex flex-col gap-1 text-xs font-medium text-stone-500">
						<span>Postal code</span>
						<input type="text" class={inputClasses} bind:value={propertyForm.postalCode} />
					</label>
				</div>

				<div class="flex justify-end gap-2 pt-2">
					<button
						type="button"
						class="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
						onclick={closePropertyModal}
						disabled={propertySubmitting}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={propertySubmitting}
					>
						{propertySubmitting ? 'Saving…' : 'Save property'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

{#if showUnitModal}
	<div
		class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-10"
		onclick={closeUnitModal}
	>
		<div
			class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
			onclick={handleModalPanelClick}
		>
			<h2 class="text-xl font-semibold text-stone-900">Add unit</h2>
			<p class="mt-1 text-sm text-stone-500">
				Add a unit to <span class="font-semibold text-stone-800">{unitPropertyLabel}</span>.
			</p>

			{#if unitError}
				<p class="mt-4 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-900">{unitError}</p>
			{/if}

			<form class="mt-4 flex flex-col gap-4" onsubmit={submitUnit}>
				<label class="flex flex-col gap-1 text-xs font-medium text-stone-500">
					<span>Unit number *</span>
					<input
						type="text"
						class={inputClasses}
						placeholder="Unit 5"
						bind:value={unitForm.unitNumber}
						required
					/>
				</label>

				<label class="flex flex-col gap-1 text-xs font-medium text-stone-500">
					<span>Floor</span>
					<input
						type="text"
						class={inputClasses}
						placeholder="e.g. 3 or Penthouse"
						bind:value={unitForm.floor}
					/>
				</label>

				<div class="grid gap-4 sm:grid-cols-3">
					<label class="flex flex-col gap-1 text-xs font-medium text-stone-500">
						<span>Beds</span>
						<input type="number" min="0" class={inputClasses} bind:value={unitForm.beds} />
					</label>
					<label class="flex flex-col gap-1 text-xs font-medium text-stone-500">
						<span>Baths</span>
						<input
							type="number"
							min="0"
							step="0.5"
							class={inputClasses}
							bind:value={unitForm.baths}
						/>
					</label>
					<label class="flex flex-col gap-1 text-xs font-medium text-stone-500">
						<span>Sqft</span>
						<input type="number" min="0" class={inputClasses} bind:value={unitForm.sqft} />
					</label>
				</div>

				<label class="flex flex-col gap-1 text-xs font-medium text-stone-500">
					<span>Notes</span>
					<textarea
						rows="3"
						class={`resize-none ${inputClasses}`}
						placeholder="Optional notes"
						bind:value={unitForm.notes}
					></textarea>
				</label>

				<div class="flex justify-end gap-2 pt-2">
					<button
						type="button"
						class="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
						onclick={closeUnitModal}
						disabled={unitSubmitting}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={unitSubmitting}
					>
						{unitSubmitting ? 'Saving…' : 'Save unit'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
