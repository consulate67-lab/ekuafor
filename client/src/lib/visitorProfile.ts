export type VisitorProfile = {
    firstName: string;
    lastName: string;
    phone: string;
};

const KEY = 'saloon_visitor_profile';

export function loadVisitorProfile(): VisitorProfile | null {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<VisitorProfile>;
        const firstName = String(parsed.firstName || '').trim();
        const lastName = String(parsed.lastName || '').trim();
        const phone = String(parsed.phone || '').replace(/\D/g, '').slice(0, 11);
        if (!firstName || !lastName || phone.length < 10) return null;
        return { firstName, lastName, phone };
    } catch {
        return null;
    }
}

export function saveVisitorProfile(profile: VisitorProfile): void {
    const firstName = profile.firstName.trim();
    const lastName = profile.lastName.trim();
    const phone = profile.phone.replace(/\D/g, '').slice(0, 11);
    localStorage.setItem(KEY, JSON.stringify({ firstName, lastName, phone }));
    // BookingPage ve sync ile uyum
    localStorage.setItem('customer_phone', phone);
}

export function visitorFullName(p: VisitorProfile): string {
    return `${p.firstName} ${p.lastName}`.trim();
}
