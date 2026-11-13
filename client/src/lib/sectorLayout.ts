/** Firma sayfası layout grubu — slug → güzellik / spor / klinik */
export type SectorLayoutGroup = 'beauty' | 'sport' | 'clinic' | 'default';

const BEAUTY = new Set([
    'hair', 'barber', 'beauty', 'nail', 'nails', 'lash', 'spa', 'massage', 'wellness',
    'laser', 'pmu', 'tattoo', 'solarium', 'pet_grooming',
]);
const SPORT = new Set([
    'pilates_yoga', 'fitness', 'pool', 'sports_facility', 'gym', 'dance', 'martial',
]);
const CLINIC = new Set([
    'medical', 'dental', 'plastic_surgery', 'physio', 'podiatry', 'veterinary',
    'dietitian', 'psychology', 'dermatology', 'optic',
]);

export function sectorLayoutGroup(slug?: string | null): SectorLayoutGroup {
    if (!slug) return 'default';
    if (BEAUTY.has(slug)) return 'beauty';
    if (SPORT.has(slug)) return 'sport';
    if (CLINIC.has(slug)) return 'clinic';
    return 'default';
}

export const LAYOUT_THEME: Record<
    SectorLayoutGroup,
    { heroFrom: string; heroTo: string; accent: string; accentSoft: string; cta: string }
> = {
    beauty: {
        heroFrom: '#9d174d',
        heroTo: '#0f172a',
        accent: '#be185d',
        accentSoft: '#fdf2f8',
        cta: 'bg-rose-600',
    },
    sport: {
        heroFrom: '#047857',
        heroTo: '#0f172a',
        accent: '#059669',
        accentSoft: '#ecfdf5',
        cta: 'bg-emerald-600',
    },
    clinic: {
        heroFrom: '#0369a1',
        heroTo: '#0f172a',
        accent: '#0284c7',
        accentSoft: '#f0f9ff',
        cta: 'bg-sky-600',
    },
    default: {
        heroFrom: '#4f46e5',
        heroTo: '#0f172a',
        accent: '#4f46e5',
        accentSoft: '#eef2ff',
        cta: 'bg-indigo-600',
    },
};
