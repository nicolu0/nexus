<script lang="ts">
	import PropertyList from '$lib/components/md/PropertyList.svelte';
	import Header from '$lib/components/md/Header.svelte';
	import PropertyToolbar from '$lib/components/md/PropertyToolbar.svelte';
	import UnitPage from '$lib/components/lg/UnitPage.svelte';
	import type { Property, PropertyStatusFilter, Section, UnitSummary } from '$lib/types/dashboard';
	import supabase from '$lib/supabaseClient';
	import { onMount } from 'svelte';

	const DEFAULT_UNIT_SECTIONS = [
		{ label: 'Kitchen', slug: 'kitchen' },
		{ label: 'Bedroom', slug: 'bedroom' },
		{ label: 'Bathroom', slug: 'bathroom' }
	] as const;

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

	const UNIT_IMAGES_BUCKET = 'unit-images';

	const createSectionForm = () => ({
		label: ''
	});

	let showSectionModal = $state(false);
	let sectionForm = $state(createSectionForm());
	let sectionError = $state('');
	let sectionSubmitting = $state(false);
	let sectionUnitLabel = $state('');
	let sectionPropertyName = $state('');
	let sectionTargetUnitId = $state<string | null>(null);
	let sectionTargetPropertyId = $state<string | null>(null);

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
						.select(`id, unit_number`)
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
							sections: sectionsByUnit.get(unit.id) ?? []
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
		void loadSectionsForUnit(unitId);
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

	const openSectionModal = () => {
		if (!selectedUnit || !selectedProperty) {
			return;
		}
		sectionForm = createSectionForm();
		sectionError = '';
		sectionTargetUnitId = selectedUnit.id;
		sectionTargetPropertyId = selectedProperty.id;
		sectionUnitLabel = selectedUnit.label;
		sectionPropertyName = selectedProperty.name;
		showSectionModal = true;
	};

	const closeSectionModal = () => {
		if (sectionSubmitting) return;
		showSectionModal = false;
		sectionForm = createSectionForm();
		sectionError = '';
		sectionTargetUnitId = null;
		sectionTargetPropertyId = null;
		sectionUnitLabel = '';
		sectionPropertyName = '';
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

			const defaultSectionsPayload = DEFAULT_UNIT_SECTIONS.map((section) => ({
				unit_id: insertedUnit.id,
				label: section.label,
				kind: 'preset'
			}));

			const { error: sectionInsertError } = await supabase
				.from('unit_sections')
				.insert(defaultSectionsPayload);

			if (sectionInsertError) {
				console.log(sectionInsertError);
				throw sectionInsertError;
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

	const submitSection = async (event: SubmitEvent) => {
		event.preventDefault();
		if (sectionSubmitting) return;

		const unitId = sectionTargetUnitId;
		const propertyId = sectionTargetPropertyId;

		if (!unitId || !propertyId) {
			sectionError = 'Select a unit before adding a section.';
			return;
		}

		const trimmedLabel = sectionForm.label.trim();
		if (!trimmedLabel) {
			sectionError = 'Section name is required.';
			return;
		}

		sectionSubmitting = true;
		sectionError = '';

		try {
			const { data: insertedSection, error } = await supabase
				.from('unit_sections')
				.insert({
					unit_id: unitId,
					label: trimmedLabel,
					kind: 'custom'
				})
				.select('id, label, unit_id')
				.single();

			if (error || !insertedSection) {
				throw error ?? new Error('Unable to add section.');
			}

			const normalizedSection: Section = {
				id: insertedSection.id ?? `${unitId}-${Date.now()}`,
				label: insertedSection.label ?? trimmedLabel,
				photos: null
			};

			await loadSectionsForUnit(unitId);

			properties = properties.map((property) =>
				property.id === propertyId
					? {
							...property,
							units: property.units.map((unit) =>
								unit.id === unitId
									? { ...unit, sections: [...unit.sections, normalizedSection] }
									: unit
							)
						}
					: property
			);

			const updatedProperty = properties.find((property) => property.id === propertyId);
			if (updatedProperty) {
				selectedProperty = updatedProperty;
				const updatedUnit = updatedProperty.units.find((unit) => unit.id === unitId);
				if (updatedUnit) {
					selectedUnit = updatedUnit;
				}
			}

			showSectionModal = false;
			sectionForm = createSectionForm();
			sectionTargetUnitId = null;
			sectionTargetPropertyId = null;
			sectionUnitLabel = '';
			sectionPropertyName = '';
		} catch (error) {
			sectionError = error instanceof Error ? error.message : 'Unable to add section.';
		} finally {
			sectionSubmitting = false;
		}
	};

	const inputClasses =
		'rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200';

	let sections = $state<Section[]>([]);
	let sectionsLoading = $state(false);
	let sectionsError = $state('');
	let unitImagesRequestId = 0;

	const phaseKeyFromValue = (phase: string | null): 'move-in' | 'move-out' | 'repair' => {
		switch (phase) {
			case 'move_in':
				return 'move-in';
			case 'move_out':
				return 'move-out';
			default:
				return 'repair';
		}
	};

	const loadSectionsForUnit = async (unitId: string) => {
		const requestId = ++unitImagesRequestId;
		sectionsLoading = true;
		sectionsError = '';

		try {
			const { data: sectionRows, error: sectionError } = await supabase
				.from('unit_sections')
				.select('id, label')
				.eq('unit_id', unitId)
				.order('created_at', { ascending: true });

			if (sectionError) {
				throw sectionError;
			}

			let resolvedSections =
				sectionRows?.map((row, idx) => ({
					id: row.id ?? `section-${idx}`,
					label: row.label ?? 'Section',
					photos: null
				})) ?? [];

			const sectionMap = new Map(resolvedSections.map((section) => [section.id, section]));

			const sectionIds = sectionRows?.map((row) => row.id).filter(Boolean) ?? [];

			let imageRows:
				| {
						id: string;
						section_id: string | null;
						phase: string | null;
						bucket: string | null;
						path: string | null;
				  }[]
				| null = [];

			if (sectionIds.length > 0) {
				const { data, error: imageError } = await supabase
					.from('images')
					.select('id, section_id, phase, bucket, path')
					.in('section_id', sectionIds)
					.order('created_at', { ascending: true });

				if (imageError) {
					throw imageError;
				}

				imageRows = data;
			}

			for (const row of imageRows ?? []) {
				if (!row.path || !row.section_id) continue;
				const section = sectionMap.get(row.section_id);
				if (!section) continue;

				const bucketName = row.bucket || UNIT_IMAGES_BUCKET;
				const publicUrl =
					supabase.storage.from(bucketName).getPublicUrl(row.path).data?.publicUrl ?? null;
				if (!publicUrl) continue;

				const phaseKey = phaseKeyFromValue(row.phase as string | null);
				section.photos = {
					...(section.photos ?? {}),
					[phaseKey]: publicUrl
				};
			}

			if (requestId === unitImagesRequestId) {
				sections = Array.from(sectionMap.values());
			}
		} catch (error) {
			if (requestId === unitImagesRequestId) {
				sectionsError = error instanceof Error ? error.message : 'Unable to load unit sections.';
				sections = [];
			}
			console.error('Unable to load unit sections', error);
		} finally {
			if (requestId === unitImagesRequestId) {
				sectionsLoading = false;
			}
		}
	};

	const handleDashboardKeydown = (event: KeyboardEvent) => {
		if (event.key !== 'Escape') return;
		if (showSectionModal) {
			event.preventDefault();
			closeSectionModal();
			return;
		}
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
			<h2 class="text-xl font-semibold text-stone-900">Add Property</h2>
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
			<h2 class="text-xl font-semibold text-stone-900">Add Unit</h2>
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
