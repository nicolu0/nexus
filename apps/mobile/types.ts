export type Tenancy = {
    id: string;
    tenant_name: string;
    lease_start_date: string; // 'YYYY-MM-DD'
    move_out_date: string | null;
};

export type Unit = {
    id: string;
    unit_number: string;
    tenancies: Tenancy[] | null;
};

export type Property = {
    id: string;
    name: string;
    address_line1: string | null;
    city: string | null;
    state: string | null;
    latitude: number | null;
    longitude: number | null;
    units: Unit[] | null;
};

export type Room = {
    id: string;
    name: string;
};

export type ImageRow = {
    id: string;
    path: string;
    session?: { phase: string } | null;
};

export type GroupRow = {
    id: string;
    name: string;
    tenancy_id: string | null;
    description: string | null;
    room: Room | null;
    images: ImageRow[] | null;
};

export type TenancyStatus = 'Upcoming' | 'Active' | 'Vacated' | 'No tenancy';

export type SessionStatus = 'in_progress' | 'completed' | 'abandoned' | string;
export type SessionPhase = string;

export type SessionRow = {
    id: string;
    unit_id: string;
    tenancy_id: string | null;
    phase: SessionPhase;
    status: SessionStatus;
    created_by: string | null;
    started_at: string;
    completed_at: string | null;
    last_activity_at: string;
    tenancies: {
        unit_id: string;
        units: {
            unit_number: string;
            properties: {
                name: string;
                address_line1: string | null;
            } | null;
        } | null;
    } | null;
};

