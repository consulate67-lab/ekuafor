import client from './client';
import type { Service } from '../types';

export interface SectorBadge {
    slug: string;
    name: string;
    icon: string;
    color: string;
}

/** Herkese açık uçların döndürdüğü firma alanları (sunucuda `toPublicCompany`). */
export interface PublicCompany {
    id: number;
    name: string;
    description?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    photo?: string | null;
    address_line?: string | null;
    city?: string | null;
    district?: string | null;
    neighborhood?: string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
    work_start_time?: string | null;
    work_end_time?: string | null;
    genders?: string[] | null;
    booking_flow?: string | null;
    staff_label?: string | null;
    service_label?: string | null;
    rating_avg?: number | string | null;
    review_count?: number | null;
    is_bookable?: boolean;
    is_license_expired?: boolean;
    distance_km?: number | null;
    primary_sector?: SectorBadge | null;
    sectors?: SectorBadge[];
}

export interface CompanyListParams {
    search?: string;
    sector?: string;
    gender?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    sort?: 'rating' | 'reviews' | 'newest' | 'distance';
    page?: number;
    limit?: number;
}

export interface Review {
    id: number;
    rating: number;
    comment: string | null;
    appointment_date: string;
    customer_name: string;
    service_name: string | null;
}

export interface PublicEmployee {
    id: number;
    first_name: string;
    last_name: string;
    title?: string | null;
    photo?: string | null;
}

export const companiesApi = {
    list: async (params: CompanyListParams): Promise<{ companies: PublicCompany[]; hasMore: boolean }> => {
        const res = await client.get('/companies', { params: { is_active: true, exclude_parent: true, ...params } });
        return { companies: res.data.data || [], hasMore: !!res.data.has_more };
    },

    get: async (id: number): Promise<PublicCompany> => (await client.get(`/companies/${id}`)).data.data,

    services: async (id: number): Promise<Service[]> =>
        ((await client.get('/services', { params: { company_id: id } })).data.data || []).filter((s: Service) => s.is_active !== false),

    employees: async (id: number): Promise<PublicEmployee[]> => (await client.get(`/companies/${id}/employees`)).data.data || [],

    reviews: async (id: number, sort: 'newest' | 'rating_desc' | 'rating_asc' = 'newest'): Promise<Review[]> =>
        (await client.get(`/appointments/companies/${id}/reviews`, { params: { sort } })).data.data || [],
};
