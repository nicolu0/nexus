export type Triplet = {
	'move-in'?: string;
	'move-out'?: string;
	repair?: string;
};

export type UnitSummary = {
	id: string;
	label: string;
	stage: string;
};

export type StageValue = 'Vacant' | 'Move-in' | 'Move-out';

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
