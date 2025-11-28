<script lang="ts">
	import PropertyList from '$lib/components/md/PropertyList.svelte';
	import Header from '$lib/components/md/Header.svelte';
	import PropertyToolbar from '$lib/components/md/PropertyToolbar.svelte';
	import UnitPage from '$lib/components/lg/UnitPage.svelte';
	import AddPropertyModal from '$lib/components/modals/AddPropertyModal.svelte';
	import AddUnitModal from '$lib/components/modals/AddUnitModal.svelte';
	import type { Property, PropertyStatusFilter, Section, UnitSummary } from '$lib/types/dashboard';
	import supabase from '$lib/supabaseClient';
	import { onMount } from 'svelte';

	let selectedUnit = $state<UnitSummary | null>(null);
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
	let unitPanelFullscreen = $state(false);

	const loadProperties = async () => {
		isLoading = true;
		try {
			const { data: propertyRows, error } = await supabase
				.from('properties')
				.select(`id, name, address_line1, address_line2, city, state, postal_code`);

			if (error) {
				console.log(error);
				throw error;
			}

			const hydrated = await Promise.all(
				(propertyRows ?? []).map(async (property, idx) => {
					const { data: unitRows, error: unitsError } = await supabase
						.from('units')
						.select(`id, unit_number, stage`)
						.eq('property_id', property.id);

					if (unitsError) {
						console.error(`Unable to load units for property ${property.id}`, unitsError);
					}

					const unitIds = (unitRows ?? []).map((unit) => unit.id);
					const sectionsByUnit = new Map<string, Section[]>();

					if (unitIds.length > 0) {
						const { data: sectionRows, error: sectionsError } = await supabase
							.from('rooms')
							.select('id, name, unit_id')
							.in('unit_id', unitIds);

						if (sectionsError) {
							console.error(`Unable to load sections for property ${property.id}`, sectionsError);
						}

						for (const row of sectionRows ?? []) {
							if (!row.unit_id) continue;
							const nextSection: Section = {
								id: row.id ?? `${row.unit_id}-section`,
								label: row.name ?? 'Section',
								photos: null
							};
							const existing = sectionsByUnit.get(row.unit_id) ?? [];
							sectionsByUnit.set(row.unit_id, [...existing, nextSection]);
						}
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
						name: property.name || `Property ${idx + 1}`,
						address: address,
						units: (unitRows ?? []).map((unit, unitIndex) => ({
							id: unit.id,
							label: unit.unit_number ?? `Unit ${unitIndex + 1}`,
							stage: unit.stage
						}))
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
	type StageValue = 'Vacant' | 'Move-in' | 'Move-out';

	function handleUnitStageChange(next: StageValue) {
		if (!selectedUnit) return;
		const unitId = selectedUnit.id;

		// update the selectedUnit object
		selectedUnit = {
			...selectedUnit,
			stage: next
		};

		// update the matching unit inside properties → units
		properties = properties.map((property) => ({
			...property,
			units: property.units.map((unit) => (unit.id === unitId ? { ...unit, stage: next } : unit))
		}));
	}

	onMount(() => {
		void loadProperties();
	});

	$effect(() => {
		const propertyTerm = propertyQuery.trim().toLowerCase();
		const unitTerm = unitQuery.trim().toLowerCase();
		const filter = statusFilter;

		filteredProperties = properties.filter((property) => {
			const addressText = (property.address ?? '').toLowerCase();
			const nameText = (property.name ?? '').toLowerCase();
			const propertyMatches =
				propertyTerm.length === 0 ||
				addressText.includes(propertyTerm) ||
				nameText.includes(propertyTerm);
			const unitMatches =
				unitTerm.length === 0 ||
				property.units.some((unit) => unit.label.toLowerCase().includes(unitTerm));
			const statusMatches =
				filter === 'all'
					? true
					: filter === 'withUnits'
						? property.units.length > 0
						: property.units.length === 0;
			return propertyMatches && unitMatches && statusMatches;
		});
	});

	$effect(() => {
		const unitId = selectedUnit?.id ?? null;
		if (!unitId) {
			sections = [];
			sectionsError = '';
			sectionsLoading = false;
			unitPanelFullscreen = false;
			return;
		}
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

		try {
			const { data: userData, error: userError } = await supabase.auth.getUser();

			if (userError) {
				throw userError;
			}

			const userId = userData.user?.id;

			if (!userId) {
				throw new Error('Please sign in to create a property.');
			}

			const payload = {
				name: trimmedName || null,
				address_line1: trimmedAddress || null,
				address_line2: propertyForm.addressLine2.trim() || null,
				city: propertyForm.city.trim() || null,
				state: propertyForm.state.trim() || null,
				postal_code: propertyForm.postalCode.trim() || null,
				user_id: userId
			};

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

		unitSubmitting = true;
		unitError = '';

		const trimmedUnitNumber = unitForm.unitNumber.trim();
		const payload = {
			property_id: unitForm.propertyId,
			unit_number: trimmedUnitNumber,
			floor: unitForm.floor.trim() || null,
			beds: unitForm.beds ? Number(unitForm.beds) : null,
			baths: unitForm.baths ? Number(unitForm.baths) : null,
			sqft: unitForm.sqft ? Number(unitForm.sqft) : null,
			notes: unitForm.notes.trim() || null
		};

		try {
			const { data: insertedUnit, error } = await supabase
				.from('units')
				.insert(payload)
				.select('id, property_id')
				.single();

			if (error || !insertedUnit) {
				throw error ?? new Error('Unable to create unit.');
			}

			showUnitModal = false;
			unitForm = createUnitForm();
			await loadProperties();
		} catch (error) {
			unitError = error instanceof Error ? error.message : 'Unable to create unit.';
		} finally {
			unitSubmitting = false;
		}
	};

	const inputClasses =
		'rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200';

	let sections = $state<Section[]>([]);
	let sectionsLoading = $state(false);
	let sectionsError = $state('');

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
</script>

<svelte:window on:keydown={handleDashboardKeydown} />

<div class="flex h-dvh w-full flex-col bg-stone-50">
	<Header />

	<div class="relative flex min-h-0 flex-1 flex-row overflow-hidden">
		<div class="flex min-h-0 w-full flex-col gap-4 overflow-y-auto px-10 py-6">
			<PropertyToolbar
				{propertyQuery}
				{unitQuery}
				{statusFilter}
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
					unitPanelFullscreen = false;
				}}
			/>
		</div>
		<UnitPage
			{selectedUnit}
			{selectedProperty}
			isFullscreen={unitPanelFullscreen}
			onToggleFullscreen={() => {
				unitPanelFullscreen = !unitPanelFullscreen;
			}}
			onClose={() => {
				selectedUnit = null;
				selectedProperty = null;
				unitPanelFullscreen = false;
			}}
			onStageChange={handleUnitStageChange}
		/>
	</div>
</div>

{#if showPropertyModal}
	<AddPropertyModal
		{propertyForm}
		{propertyError}
		{propertySubmitting}
		{inputClasses}
		onClose={closePropertyModal}
		onSubmit={submitProperty}
	/>
{/if}

{#if showUnitModal}
	<AddUnitModal
		{unitPropertyLabel}
		{unitForm}
		{unitError}
		{unitSubmitting}
		{inputClasses}
		onClose={closeUnitModal}
		onSubmit={submitUnit}
	/>
{/if}
