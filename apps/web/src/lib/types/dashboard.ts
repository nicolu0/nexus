export type Triplet = {
	'move-in'?: string;
	'move-out'?: string;
	repair?: string;
};

export type UnitSummary = {
	id: string;
	label: string;
};

export type Section = {
	id: string;
	label: string;
	photos: Triplet | null;
};

export type Property = {
	id: string;
	name: string;
	address: string;
	units: UnitSummary[];
};

export type PropertyStatusFilter = 'all' | 'withUnits' | 'withoutUnits';
