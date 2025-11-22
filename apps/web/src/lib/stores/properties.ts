import supabase from '$lib/supabaseClient';
import { writable } from 'svelte/store';

export type UnitStatus = 'Not started' | 'In progress' | 'Done';

export type UnitRecord = {
	id: string;
	title: string;
	status: UnitStatus;
};

export type UnitImageRecord = {
	id: string;
	section: string;
	phase: 'before' | 'after';
	bucket: string;
	path: string;
	mime_type: string | null;
	sort_order: number;
	created_at: string | null;
	url: string | null;
};

export type PropertyRecord = {
	id: string;
	name: string;
	address: string;
	expanded: boolean;
	units: UnitRecord[];
};

type DBUnitRow = {
	id: string;
	unit_number: string | null;
};

type DBPropertyRow = {
	id: string;
	name: string | null;
	address_line1: string | null;
	address_line2: string | null;
	city: string | null;
	state: string | null;
	postal_code: string | null;
	country?: string | null;
	units?: DBUnitRow[] | null;
};

function formatAddress(row: DBPropertyRow) {
	const cityState = [row.city, row.state].filter(Boolean).join(', ');
	const parts = [row.address_line1, row.address_line2, cityState, row.postal_code].filter(
		(part) => typeof part === 'string' && part.trim().length > 0
	);
	return parts.join(', ') || row.name || 'Untitled property';
}

function mapUnit(unit: DBUnitRow, idx: number): UnitRecord {
	return {
		id: unit.id,
		title: unit.unit_number ?? `Unit ${idx + 1}`,
		status: 'Not started'
	};
}

function mapProperty(row: DBPropertyRow): PropertyRecord {
	return {
		id: row.id,
		name: row.name ?? formatAddress(row),
		address: formatAddress(row),
		expanded: false,
		units: (row.units ?? []).map(mapUnit)
	};
}

const { subscribe, set, update } = writable<PropertyRecord[]>([]);

export const propertiesStore = { subscribe };

export async function fetchProperties() {
	const { data, error } = await supabase
		.from('properties')
		.select(
			`
        id,
        name,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        units:units (
          id,
          unit_number
        )
      `
		)
		.order('created_at', { ascending: true });

	if (error) {
		throw error;
	}

	const mapped = (data ?? []).map(mapProperty);
	set(mapped);
	return mapped;
}

type CreatePropertyInput = {
	addressLine1: string;
	unitsCount: number;
};

export async function createPropertyOptimistic(input: CreatePropertyInput) {
	const trimmedAddress = input.addressLine1.trim();
	const propertyName = trimmedAddress || 'New property';
	const unitsCount = Math.max(0, Number(input.unitsCount) || 0);
	const optimisticId = crypto.randomUUID();

	const optimisticUnits: UnitRecord[] = Array.from({ length: unitsCount }, (_, idx) => ({
		id: `${optimisticId}-unit-${idx + 1}`,
		title: `Unit ${idx + 1}`,
		status: 'Not started'
	}));

	const optimisticProperty: PropertyRecord = {
		id: optimisticId,
		name: propertyName,
		address: trimmedAddress || propertyName,
		expanded: true,
		units: optimisticUnits
	};

	update((current) => [...current, optimisticProperty]);

	try {
		const { data: insertedProperty, error: propertyError } = await supabase
			.from('properties')
			.insert({
				name: propertyName,
				address_line1: trimmedAddress
			})
			.select('id, name, address_line1, address_line2, city, state, postal_code')
			.single();

		if (propertyError || !insertedProperty) {
			throw propertyError ?? new Error('Unable to create property');
		}

		let persistedUnits: UnitRecord[] = [];

		if (unitsCount > 0) {
			const payload = optimisticUnits.map((unit) => ({
				property_id: insertedProperty.id,
				unit_number: unit.title
			}));

			const { data: createdUnits, error: unitsError } = await supabase
				.from('units')
				.insert(payload)
				.select('id, unit_number');

			if (unitsError) {
				throw unitsError;
			}

			persistedUnits = (createdUnits ?? []).map(mapUnit);
		}

		update((current) =>
			current.map((property) =>
				property.id === optimisticId
					? {
							...property,
							id: insertedProperty.id,
							name: insertedProperty.name ?? propertyName,
							address: formatAddress(insertedProperty),
							expanded: true,
							units: persistedUnits
					  }
					: property
			)
		);

		return { success: true };
	} catch (error) {
		update((current) => current.filter((property) => property.id !== optimisticId));
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unable to create property'
		};
	}
}

export function updatePropertyAt(index: number, updater: (property: PropertyRecord) => PropertyRecord) {
	update((current) => current.map((property, idx) => (idx === index ? updater(property) : property)));
}

export function updateUnitStatus(propertyIndex: number, unitIndex: number, status: UnitStatus) {
	updatePropertyAt(propertyIndex, (property) => ({
		...property,
		units: property.units.map((unit, idx) => (idx === unitIndex ? { ...unit, status } : unit))
	}));
}

export async function fetchUnitImages(unitId: string): Promise<UnitImageRecord[]> {
	const { data, error } = await supabase
		.from('images')
		.select('id, section_name, phase, bucket, path, mime_type, sort_order, created_at')
		.eq('unit_id', unitId)
		.order('section_name', { ascending: true })
		.order('phase', { ascending: true })
		.order('sort_order', { ascending: true });

	if (error) {
		throw error;
	}

	return (data ?? []).map((row) => {
		const publicUrl = supabase.storage.from(row.bucket).getPublicUrl(row.path).data?.publicUrl ?? null;
		return {
			id: row.id,
			section: row.section_name,
			phase: row.phase as 'before' | 'after',
			bucket: row.bucket,
			path: row.path,
			mime_type: row.mime_type,
			sort_order: row.sort_order,
			created_at: row.created_at,
			url: publicUrl
		};
	});
}
