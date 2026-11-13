import type { BookingMode } from '../types';

export interface Labels {
    /** Randevu verilen kişi: "Uzman", "Eğitmen", "Doktor"… */
    staff: string;
    staffPlural: string;
    /** Satılan şey: "Hizmet", "Ders", "Seans"… */
    service: string;
    servicePlural: string;
    /** Kiralanan yer: "Saha", "Kulvar", "Oda"… */
    resource: string;
    resourcePlural: string;
}

const BASE: Labels = {
    staff: 'Çalışan', staffPlural: 'Çalışanlarımız',
    service: 'Hizmet', servicePlural: 'Hizmetler',
    resource: 'Alan', resourcePlural: 'Alanlar',
};

/** Tüm sektörlerde ekip başlığı: Çalışanlarımız */
const BY_SECTOR: Record<string, Partial<Labels>> = {
    barber: {},
    hair: {},
    beauty: {},
    pilates_yoga: { service: 'Ders', servicePlural: 'Dersler', resource: 'Salon', resourcePlural: 'Salonlar' },
    fitness: { service: 'Ders', servicePlural: 'Dersler', resource: 'Salon', resourcePlural: 'Salonlar' },
    pool: { resource: 'Kulvar', resourcePlural: 'Kulvarlar' },
    sports_facility: { service: 'Kiralama', servicePlural: 'Kiralamalar', resource: 'Saha', resourcePlural: 'Sahalar' },
    wellness: { resource: 'Oda', resourcePlural: 'Odalar' },
    medical: { service: 'Muayene', servicePlural: 'Muayeneler', resource: 'Oda', resourcePlural: 'Odalar' },
    dental: { service: 'Tedavi', servicePlural: 'Tedaviler', resource: 'Ünit', resourcePlural: 'Ünitler' },
    plastic_surgery: { service: 'İşlem', servicePlural: 'İşlemler', resource: 'Oda', resourcePlural: 'Odalar' },
    physio: { service: 'Seans', servicePlural: 'Seanslar', resource: 'Oda', resourcePlural: 'Odalar' },
    podiatry: { resource: 'Kabin', resourcePlural: 'Kabinler' },
    veterinary: { service: 'Muayene', servicePlural: 'Muayeneler' },
};

/**
 * Sektöre göre ekran metinleri. Firmanın elle girdiği `staff_label` / `service_label` her zaman önceliklidir.
 */
export const labelsFor = (sectorSlug?: string | null, overrides?: { staff_label?: string | null; service_label?: string | null }): Labels => {
    const labels = { ...BASE, ...(sectorSlug ? BY_SECTOR[sectorSlug] : undefined) };
    if (overrides?.staff_label) labels.staff = overrides.staff_label;
    if (overrides?.service_label) labels.service = overrides.service_label;
    return labels;
};

export const BOOKING_MODE_TEXT: Record<BookingMode, { label: string; icon: string; hint: string }> = {
    staff: { label: 'Personelle', icon: '👤', hint: 'Müşteri personel ve saat seçer (kuaför, masaj, klinik)' },
    resource: { label: 'Alan kiralama', icon: '📍', hint: 'Saha, kulvar veya oda saatlik kiralanır' },
    class: { label: 'Grup dersi', icon: '👥', hint: 'Kapasiteli seanslara kayıt alınır (pilates, yoga)' },
};
