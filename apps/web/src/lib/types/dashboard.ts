export type Triplet = {
	movein?: string;
	moveout?: string;
	repair?: string;
};

export type Section = {
	id: string;
	label: string;
	photos: Triplet | null;
};

export type Building = {
	id: string;
	address: string;
	units: string[];
};
