<script lang="ts">
	import PropertyList from '$lib/components/md/PropertyList.svelte';
	import Header from '$lib/components/md/Header.svelte';
	import PropertyToolbar from '$lib/components/md/PropertyToolbar.svelte';
	import UnitDetailPanel from '$lib/components/lg/UnitDetailPanel.svelte';
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

	const UNIT_IMAGES_BUCKET = 'unit-images';
	const PHOTO_PHASES = [
		{ value: 'move_in', label: 'Move in', sortOrder: 0 },
		{ value: 'move_out', label: 'Move out', sortOrder: 1 },
		{ value: 'repair', label: 'Repair', sortOrder: 2 }
	] as const;
	type PhotoPhase = (typeof PHOTO_PHASES)[number]['value'];

	const createPhotoForm = () => ({
		sectionId: null as string | null,
		file: null as File | null,
		phase: PHOTO_PHASES[0].value as PhotoPhase
	});

	let showPhotoModal = $state(false);
	let photoForm = $state(createPhotoForm());
	let photoSectionLabel = $state('');
	let photoUnitLabel = $state('');
	let photoPropertyLabel = $state('');
	let photoUnitId = $state<string | null>(null);
	let photoSubmitting = $state(false);
	let photoError = $state('');
	let photoDragActive = $state(false);
	let photoFileInput: HTMLInputElement | null = null;

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
						units: (unitRows ?? []).map((unit, unitIndex) => ({
							id: unit.id,
							label: unit.unit_number ?? `Unit ${unitIndex + 1}`
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
			const propertyMatches = propertyTerm.length === 0 || addressText.includes(propertyTerm);
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
			sections = createSections();
			unitPanelFullscreen = false;
			return;
		}
		void loadUnitPhotos(unitId);
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

	const openPhotoModal = (section: Section) => {
		if (!selectedUnit || !selectedProperty) {
			return;
		}
		photoForm = {
			...createPhotoForm(),
			sectionId: section.id
		};
		photoSectionLabel = section.label;
		photoUnitLabel = selectedUnit.label;
		photoUnitId = selectedUnit.id;
		photoPropertyLabel = selectedProperty.address;
		photoError = '';
		photoDragActive = false;
		showPhotoModal = true;
	};

	const closePhotoModal = () => {
		if (photoSubmitting) return;
		showPhotoModal = false;
		photoForm = createPhotoForm();
		photoDragActive = false;
		photoUnitId = null;
		photoError = '';
		photoUnitLabel = '';
		photoSectionLabel = '';
		photoPropertyLabel = '';
		if (photoFileInput) {
			photoFileInput.value = '';
		}
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
			const { error } = await supabase.from('units').insert(payload);
			if (error) {
				throw error;
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

	const handlePhotoFileSelection = (file: File | undefined | null) => {
		if (!file) {
			if (photoFileInput) {
				photoFileInput.value = '';
			}
			photoForm = {
				...photoForm,
				file: null
			};
			photoError = '';
			return;
		}

		const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');

		if (!isPng) {
			photoError = 'Only PNG files are supported.';
			if (photoFileInput) {
				photoFileInput.value = '';
			}
			photoForm = {
				...photoForm,
				file: null
			};
			return;
		}

		photoError = '';
		photoForm = {
			...photoForm,
			file
		};
	};

	const handlePhotoFileChange = (event: Event) => {
		const input = event.target as HTMLInputElement;
		handlePhotoFileSelection(input.files?.[0] ?? null);
	};

	const triggerPhotoFileSelect = () => {
		photoFileInput?.click();
	};

	const handlePhotoDragOver = (event: DragEvent) => {
		event.preventDefault();
		photoDragActive = true;
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'copy';
		}
	};

	const handlePhotoDragLeave = (event: DragEvent) => {
		event.preventDefault();
		photoDragActive = false;
	};

	const handlePhotoDrop = (event: DragEvent) => {
		event.preventDefault();
		photoDragActive = false;
		const file = event.dataTransfer?.files?.[0];
		handlePhotoFileSelection(file ?? null);
	};

	const submitPhoto = async (event: SubmitEvent) => {
		event.preventDefault();
		if (photoSubmitting) return;

		if (!photoForm.file) {
			photoError = 'Drag a PNG file into the drop zone or click to select one.';
			return;
		}

		if (!photoForm.sectionId || !photoUnitId) {
			photoError = 'Select a unit and section before uploading.';
			return;
		}

		photoSubmitting = true;
		photoError = '';

		const { data: userData, error: authError } = await supabase.auth.getUser();

		if (authError) {
			photoSubmitting = false;
			photoError = authError.message;
			photoDragActive = false;
			return;
		}

		const userId = userData.user?.id;

		if (!userId) {
			photoSubmitting = false;
			photoError = 'Please sign in to upload photos.';
			photoDragActive = false;
			return;
		}

		const file = photoForm.file;
		const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png';
		const uniqueId =
			typeof crypto?.randomUUID === 'function'
				? crypto.randomUUID()
				: Math.random().toString(36).slice(2);
		const filePath = `${photoUnitId}/${photoForm.sectionId}/${Date.now()}-${uniqueId}.${fileExtension}`;

		const { error: storageError } = await supabase.storage
			.from(UNIT_IMAGES_BUCKET)
			.upload(filePath, file, {
				cacheControl: '3600',
				upsert: false,
				contentType: file.type
			});

		if (storageError) {
			photoError = storageError.message;
			console.log(storageError);
			photoSubmitting = false;
			photoDragActive = false;
			return;
		}

		const phaseDetails = PHOTO_PHASES.find((phase) => phase.value === photoForm.phase);
		const sortOrder = phaseDetails?.sortOrder ?? 0;

		try {
			const { error: insertError } = await supabase.from('images').insert({
				unit_id: photoUnitId,
				section_name: photoSectionLabel,
				phase: photoForm.phase,
				bucket: UNIT_IMAGES_BUCKET,
				path: filePath,
				mime_type: file.type,
				sort_order: sortOrder,
				taken_at: null,
				notes: null,
				tenancy_id: null,
				created_by: userId
			});

			if (insertError) {
				throw insertError;
			}

			showPhotoModal = false;
			photoForm = createPhotoForm();
			photoUnitId = null;
			photoUnitLabel = '';
			photoSectionLabel = '';
			photoPropertyLabel = '';
			if (photoFileInput) {
				photoFileInput.value = '';
			}
		} catch (error) {
			console.log(error);
			await supabase.storage.from(UNIT_IMAGES_BUCKET).remove([filePath]);
			photoError = error instanceof Error ? error.message : 'Unable to save photo.';
		} finally {
			photoSubmitting = false;
			photoDragActive = false;
		}
	};

	const inputClasses =
		'rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200';

const sectionDefinitions = [
	{ id: 'kitchen', label: 'Kitchen' },
	{ id: 'bathroom', label: 'Bathroom' },
	{ id: 'bedroom', label: 'Bedroom' },
	{ id: 'living', label: 'Living' },
	{ id: 'other', label: 'Other' }
] as const;

const createSections = (): Section[] =>
	sectionDefinitions.map((section) => ({
		id: section.id,
		label: section.label,
		photos: null
	}));

let sections = $state<Section[]>(createSections());
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

const loadUnitPhotos = async (unitId: string) => {
	const requestId = ++unitImagesRequestId;

	const nextSections = createSections();
	const sectionMap = new Map(nextSections.map((section) => [section.id, section]));
	sections = nextSections;

	try {
		const { data, error } = await supabase
			.from('images')
			.select('id, section_id, section_name, phase, bucket, path')
			.eq('unit_id', unitId)
			.order('section_name', { ascending: true })
			.order('sort_order', { ascending: true })
			.order('phase', { ascending: true });

		if (error) {
			throw error;
		}

		for (const row of data ?? []) {
			if (!row.path) continue;

			const sectionId =
				(row.section_id && sectionMap.has(row.section_id)) ? row.section_id : 'other';
			const section = sectionMap.get(sectionId);
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
		console.error('Unable to load unit photos', error);
	} finally {
		// no-op
	}
};

	const handleDashboardKeydown = (event: KeyboardEvent) => {
		if (event.key !== 'Escape') return;
		if (showPhotoModal) {
			event.preventDefault();
			closePhotoModal();
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
		<UnitDetailPanel
			{sections}
			{selectedUnit}
			{selectedProperty}
			isFullscreen={unitPanelFullscreen}
			onToggleFullscreen={() => {
				unitPanelFullscreen = !unitPanelFullscreen;
			}}
			onAddPhoto={openPhotoModal}
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

{#if showPhotoModal}
	<div
		class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-10"
		onclick={closePhotoModal}
	>
		<div
			class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
			onclick={handleModalPanelClick}
		>
			<h2 class="text-xl font-semibold text-stone-900">Add photo</h2>
			<p class="mt-1 text-sm text-stone-500">
				Upload a PNG for <span class="font-semibold text-stone-800">{photoSectionLabel}</span> in
				<span class="font-semibold text-stone-800">{photoUnitLabel}</span>
				{#if photoPropertyLabel}
					<span class="text-stone-400">({photoPropertyLabel})</span>
				{/if}
			</p>

			{#if photoError}
				<p class="mt-4 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-900">{photoError}</p>
			{/if}

			<form class="mt-4 flex flex-col gap-4" onsubmit={submitPhoto}>
				<label class="flex flex-col gap-1 text-xs font-medium text-stone-500">
					<span>Phase</span>
					<select class={inputClasses} bind:value={photoForm.phase} disabled={photoSubmitting}>
						{#each PHOTO_PHASES as phase}
							<option value={phase.value}>{phase.label}</option>
						{/each}
					</select>
				</label>

				<div class="flex flex-col gap-2">
					<span class="text-xs font-medium tracking-wide text-stone-500 uppercase">PNG file</span>
					<div
						class={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center text-sm transition-colors ${
							photoDragActive
								? 'border-stone-500 bg-stone-50'
								: 'border-stone-300 bg-stone-50/60 hover:border-stone-400 hover:bg-stone-50'
						}`}
						role="button"
						tabindex="0"
						onclick={triggerPhotoFileSelect}
						ondragover={handlePhotoDragOver}
						ondragleave={handlePhotoDragLeave}
						ondrop={handlePhotoDrop}
					>
						{#if photoForm.file}
							<div class="flex flex-col items-center gap-1">
								<span class="text-base font-medium text-stone-900">{photoForm.file.name}</span>
								<span class="text-xs text-stone-500">
									{Math.round(photoForm.file.size / 1024)} KB
								</span>
								<button
									type="button"
									class="mt-2 text-xs font-semibold text-stone-600 underline"
									onclick={(event) => {
										event.stopPropagation();
										handlePhotoFileSelection(null);
									}}
								>
									Clear selection
								</button>
							</div>
						{:else}
							<div class="flex flex-col items-center gap-1 text-stone-500">
								<span class="text-base font-semibold text-stone-900">Drag & drop your PNG</span>
								<span>or click to browse from Finder</span>
								<span class="text-xs text-stone-400">Max 10MB</span>
							</div>
						{/if}
					</div>
				</div>

				<input
					type="file"
					accept="image/png"
					class="hidden"
					bind:this={photoFileInput}
					onchange={handlePhotoFileChange}
				/>

				<div class="flex justify-end gap-2 pt-2">
					<button
						type="button"
						class="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
						onclick={closePhotoModal}
						disabled={photoSubmitting}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={photoSubmitting || !photoForm.file}
					>
						{photoSubmitting ? 'Saving…' : photoForm.file ? 'Save photo' : 'Select a PNG'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
