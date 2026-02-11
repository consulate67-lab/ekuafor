export interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role: 'super_admin' | 'company_admin' | 'customer';
    created_at: string;
}

export interface Company {
    id?: number;
    name: string;
    description?: string;
    phone?: string;
    email?: string;
    website?: string;

    // Adres
    address_line?: string;
    province_id?: number;
    province_name?: string;
    district_id?: number;
    district_name?: string;
    neighborhood_id?: number;
    neighborhood_name?: string;
    postal_code?: string;

    // Konum
    latitude?: number;
    longitude?: number;

    // Banka
    bank_name?: string;
    bank_branch?: string;
    iban?: string;
    account_holder_name?: string;

    // Ödeme
    commission_rate?: number;
    payment_enabled?: boolean;

    // Durum
    is_active?: boolean;
    is_verified?: boolean;

    created_at?: string;
    updated_at?: string;
}

export interface Province {
    id: number;
    name: string;
    population: number;
    area: number;
    altitude: number;
    areaCode: string[];
    isMetropolitan: boolean;
}

export interface District {
    id: number;
    name: string;
    population: number;
    area: number;
}

export interface Neighborhood {
    id: number;
    name: string;
    population: number;
}

export interface CompanyEmployee {
    id: number;
    company_id: number;
    user_id: number;
    role: 'owner' | 'manager' | 'staff';
    is_active: boolean;
    created_at: string;
    // İlişkili kullanıcı bilgileri
    user?: User;
}
