import client from './client';
import type { BookingMode } from '../types';

export interface Sector {
    id: number;
    slug: string;
    name_tr: string;
    name_en: string;
    icon: string;
    color: string;
    has_medical_consent: boolean;
    default_duration_minutes: number;
    default_booking_mode: BookingMode;
    display_order: number;
}

export interface CompanySector {
    sector_id: number;
    sector_slug: string;
    sector_name_tr: string;
    sector_name_en: string;
    sector_icon: string;
    sector_color: string;
    sub_specialty: string | null;
    is_primary: boolean;
}

export interface ServiceTemplate {
    id: number;
    sector_id: number;
    sector_slug: string;
    sector_name: string;
    sector_icon: string;
    name: string;
    duration_minutes: number;
    price: string | number;
    booking_mode: BookingMode;
    duration_options: number[] | null;
}

export const sectorsApi = {
    /** Aktif sektörler (herkese açık). */
    list: async (): Promise<Sector[]> => (await client.get('/sectors')).data.sectors,

    bySlug: async (slug: string): Promise<Sector> => (await client.get(`/sectors/${encodeURIComponent(slug)}`)).data.sector,

    /** Sektör hizmet şablonları (herkese açık). */
    templates: async (): Promise<ServiceTemplate[]> => (await client.get('/sectors/templates')).data.data,

    ofCompany: async (companyId: number): Promise<CompanySector[]> =>
        (await client.get(`/companies/${companyId}/sectors`)).data.sectors,

    /** `is_primary` verilirse firmanın diğer birincil sektörü kalkar. */
    assign: async (companyId: number, sectorId: number, opts: { sub_specialty?: string; is_primary?: boolean } = {}) => {
        await client.post(`/companies/${companyId}/sectors`, {
            sector_id: sectorId,
            sub_specialty: opts.sub_specialty || null,
            is_primary: !!opts.is_primary,
        });
    },

    remove: async (companyId: number, sectorId: number) => {
        await client.delete(`/companies/${companyId}/sectors/${sectorId}`);
    },
};
